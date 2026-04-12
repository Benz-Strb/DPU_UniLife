import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { postService } from "../lib/api";

interface PostsProps {
  currentUser: any;
}

export default function Posts({ currentUser }: PostsProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const limit = 15;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await postService.getPosts({ page, limit });
      setPosts(Array.isArray(data) ? data : data.posts ?? []);
      setTotal(data.total ?? data.length ?? 0);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const handleDelete = async (post: any) => {
    if (!confirm(`Delete post by ${post.author?.fullName}?`)) return;
    try {
      await postService.deletePost(post.id, currentUser.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setTotal(t => t - 1);
    } catch {
      alert("Failed to delete post");
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

  const visibilityBadge: Record<string, string> = {
    PUBLIC: "bg-emerald-600/20 text-emerald-400",
    FRIENDS: "bg-blue-600/20 text-blue-400",
    PRIVATE: "bg-slate-700 text-slate-400",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Posts</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total posts</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Author</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Content</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Visibility</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Loading...</td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">No posts found</td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-bold">{post.author?.fullName ?? "—"}</p>
                    <p className="text-slate-500 text-xs">@{post.author?.username ?? "unknown"}</p>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="text-slate-300 text-sm truncate">{post.content || "—"}</p>
                    {post.media?.length > 0 && (
                      <p className="text-slate-500 text-xs mt-0.5">{post.media.length} media</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${visibilityBadge[post.visibility] ?? "bg-slate-700 text-slate-300"}`}>
                      {post.visibility}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(post.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(post)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-600/10 transition"
                      title="Delete post"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-xs">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
