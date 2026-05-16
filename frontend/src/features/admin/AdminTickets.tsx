import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/auth-store';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string | null;
  createdAt: string;
  messages: { body: string; createdAt: string; isStaff: boolean; userId: string }[];
}

export default function AdminTickets() {
  const { accessToken } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [filter, setFilter] = useState('');

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?page=${page}&limit=20${filter ? `&status=${filter}` : ''}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) setTickets(json.data);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchTickets(); }, [page, filter, accessToken]);

  async function openTicket(ticket: Ticket) {
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) setSelectedTicket(json.data);
    } catch { toast.error('Failed to load ticket'); }
  }

  async function handleReply() {
    if (!replyBody.trim() || !selectedTicket) return;
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ body: replyBody }),
      });
      const json = await res.json();
      if (json.success) { toast.success('Reply sent'); setReplyBody(''); openTicket(selectedTicket); }
    } catch { toast.error('Failed to send reply'); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      });
      if ((await res.json()).success) { toast.success('Status updated'); fetchTickets(); }
    } catch { toast.error('Failed to update'); }
  }

  const priorityColor = (p: string) => {
    const colors: Record<string, string> = { LOW: 'badge-neutral', MEDIUM: 'badge-info', HIGH: 'badge-warning', URGENT: 'badge-error' };
    return <span className={colors[p] || 'badge-neutral'}>{p}</span>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="select-field w-40">
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton h-8 m-2" /></td></tr>
              )) : tickets.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No tickets</td></tr>
              ) : tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openTicket(t)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.subject}</td>
                  <td className="px-4 py-3">{priorityColor(t.priority)}</td>
                  <td className="px-4 py-3"><span className="badge-info">{t.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <select onChange={(e) => { e.stopPropagation(); updateStatus(t.id, e.target.value); }} className="text-xs border rounded p-1" onClick={(e) => e.stopPropagation()} value={t.status}>
                      <option value="OPEN">Open</option>
                      <option value="PENDING">Pending</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedTicket ? `Ticket: ${selectedTicket.subject}` : 'Select a ticket'}
        </h3>
        {selectedTicket && (
          <div className="card p-4 space-y-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedTicket.messages?.map((msg, i) => (
                <div key={i} className={`p-3 rounded-lg ${msg.isStaff ? 'bg-primary-50 border border-primary-200 ml-4' : 'bg-gray-50 border border-gray-200 mr-4'}`}>
                  <div className="text-xs text-gray-500 mb-1">{msg.isStaff ? 'Staff' : 'Customer'} · {new Date(msg.createdAt).toLocaleString()}</div>
                  <div className="text-sm text-gray-700">{msg.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} className="textarea-field flex-1" rows={3} placeholder="Type your reply..." />
              <button onClick={handleReply} className="btn-primary self-end">Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
