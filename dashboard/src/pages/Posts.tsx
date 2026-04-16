import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { postService } from "../lib/api";
import { visibilityBadge } from "../lib/badges";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import UserCell from "../components/UserCell";
import Badge from "../components/Badge";
import IconButton from "../components/IconButton";
import Pagination from "../components/Pagination";

interface PostsProps {
  currentUser: any;
}

const COLUMNS = [
  { label: "Author" },
  { label: "Content" },
  { label: "Visibility" },
  { label: "Date" },
  { label: "", className: "px-5 py-3" },
];

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

  useEffect(() => { fetchPosts(); }, [page]);

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

  return (
    <div className="p-8">
      <PageHeader title="Posts" description={`${total} total posts`} />

      <DataTable
        columns={COLUMNS}
        data={posts}
        loading={loading}
        emptyMessage="No posts found"
        keyExtractor={p => p.id}
        renderRow={post => (
          <>
            <td className="px-5 py-3">
              <UserCell
                avatarUrl={post.author?.avatarUrl}
                name={post.author?.fullName ?? "—"}
                username={post.author?.username ?? "unknown"}
              />
            </td>
            <td className="px-5 py-3 max-w-xs">
              <p className="text-slate-300 text-sm truncate">{post.content || "—"}</p>
              {post.media?.length > 0 && (
                <p className="text-slate-500 text-xs mt-0.5">{post.media.length} media</p>
              )}
            </td>
            <td className="px-5 py-3">
              <Badge label={post.visibility} className={visibilityBadge[post.visibility]} />
            </td>
            <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(post.createdAt)}</td>
            <td className="px-5 py-3 text-right">
              <IconButton
                icon={<Trash2 size={16} />}
                onClick={() => handleDelete(post)}
                variant="danger"
                title="Delete post"
              />
            </td>
          </>
        )}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
