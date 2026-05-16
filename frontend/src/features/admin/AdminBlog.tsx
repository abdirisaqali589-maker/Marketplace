import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Search } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  coverImage: string | null; authorName: string; category: string | null;
  tags: string[]; status: string; publishedAt: string | null; createdAt: string;
}

export default function AdminBlog() {
  const { accessToken } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const auth = { Authorization: `Bearer ${accessToken}` };

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?page=${page}&limit=20&search=${search}`, { headers: auth });
      const json = await res.json();
      if (json.success) { setPosts(json.data); setTotal(json.pagination?.total || 0); }
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPosts(); }, [page, search]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await fetch(`/api/blog/${id}`, { method: 'DELETE', headers: auth });
      const json = await res.json();
      if (json.success) { toast.success('Post deleted'); fetchPosts(); }
      else toast.error(json.message);
    } catch { toast.error('Failed to delete'); }
  }

  async function handlePublish(id: string) {
    try {
      const res = await fetch(`/api/blog/${id}/publish`, { method: 'PATCH', headers: auth });
      const json = await res.json();
      if (json.success) { toast.success('Post published!'); fetchPosts(); }
      else toast.error(json.message);
    } catch { toast.error('Failed to publish'); }
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { DRAFT: 'badge-neutral', PUBLISHED: 'badge-success', ARCHIVED: 'badge-warning' };
    return <span className={m[s] || 'badge-neutral'}>{s}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Blog Posts</h2>
        <button className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search posts..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Author</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="skeleton h-8 m-2" /></td></tr>
              )) : posts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No blog posts yet</td></tr>
              ) : posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    {post.excerpt && <div className="text-xs text-gray-500 truncate max-w-xs">{post.excerpt}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.authorName}</td>
                  <td className="px-4 py-3">{post.category && <span className="badge-info">{post.category}</span>}</td>
                  <td className="px-4 py-3">{statusBadge(post.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === 'DRAFT' && (
                        <button onClick={() => handlePublish(post.id)} className="btn-sm btn-primary" title="Publish">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(post.id)} className="btn-sm btn-danger" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {total > 20 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{total} total posts</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">Previous</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}