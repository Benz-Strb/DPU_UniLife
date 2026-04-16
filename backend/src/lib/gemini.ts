import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

interface PostSummary {
  id: string;
  author: string;
  faculty: string;
  content: string;
  likes: number;
  comments: number;
  age_hours: number;
  is_followed_author?: boolean;
}

interface RankInput {
  userFaculty: string;
  followingIds: string[];
  authorIds: Record<string, string>;
  posts: PostSummary[];
}

export async function rankPostsWithGemini(input: RankInput): Promise<string[]> {
  const { userFaculty, followingIds, authorIds, posts } = input;
  const followingSet = new Set(followingIds);

  const postsWithFollow = posts.map(p => ({
    ...p,
    is_followed_author: followingSet.has(authorIds[p.id] ?? '') || undefined,
  }));

  const prompt = `You are a social feed ranking AI for DPU UniLife, a Thai university social app.
Rank the following posts for a user based on personal relevance and engagement.

User profile:
- Faculty: ${userFaculty}
- Following ${followingIds.length} users

Posts (JSON):
${JSON.stringify(postsWithFollow, null, 2)}

Ranking rules (in order of importance):
1. Posts from authors the user follows (is_followed_author: true)
2. Posts from the same faculty (${userFaculty})
3. Posts with higher engagement (likes + comments weighted)
4. Recency — prefer newer posts (lower age_hours)
5. Diverse content — avoid ranking the same author consecutively

Return ONLY a valid JSON array of post IDs ordered from most to least relevant.
Example: ["id1","id2","id3"]
Do not include any explanation, markdown, or extra text.`;

  const tryGenerate = async (attempt: number): Promise<string[]> => {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const ranked: string[] = JSON.parse(cleaned);
      if (!Array.isArray(ranked)) throw new Error('Response is not an array');
      const validIds = new Set(posts.map(p => p.id));
      return ranked.filter(id => validIds.has(id));
    } catch (err: any) {
      const is503 = err?.message?.includes('503') || err?.message?.includes('high demand');
      if (is503 && attempt < 2) {
        console.log(`[Gemini] 503 on attempt ${attempt}, retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        return tryGenerate(attempt + 1);
      }
      console.error(`[Gemini] Ranking failed after ${attempt} attempt(s), falling back:`, err?.message?.slice(0, 120));
      return posts.map(p => p.id);
    }
  };

  return tryGenerate(1);
}
