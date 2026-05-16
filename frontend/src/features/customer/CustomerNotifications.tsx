import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications, useMarkNotificationRead } from '../../lib/query-hooks';
import { del, patch } from '../../lib/api-enhanced';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingScreen from '../shared/LoadingScreen';
import EmptyState from '../shared/EmptyState';
import toast from 'react-hot-toast';

export default function CustomerNotifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications({ limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAll = useMutation({
    mutationFn: () => patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked read');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const notifications = data?.data || [];

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Messages & Notifications</h2>
          <p className="text-sm text-gray-500">Order updates, seller messages, and platform alerts.</p>
        </div>
        <button onClick={() => markAll.mutate()} disabled={markAll.isPending || !notifications.length} className="btn-secondary btn-sm">
          <Check className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {!notifications.length ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" description="Important account and order updates will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((item: any) => (
            <div key={item.id} className={`card p-4 ${!item.isRead ? 'border-primary-200 bg-primary-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.body || item.type}</p>
                  <p className="mt-2 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {!item.isRead && (
                    <button onClick={() => markRead.mutate(item.id)} className="p-2 text-gray-500 hover:text-primary-600" title="Mark read">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove.mutate(item.id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
