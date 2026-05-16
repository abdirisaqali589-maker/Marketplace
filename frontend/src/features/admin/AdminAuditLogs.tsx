import React, { useState } from 'react';
import { Activity, Search, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { get } from '../../lib/api-enhanced';
import { useQuery } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import LoadingScreen from '../shared/LoadingScreen';

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, search, actionFilter],
    queryFn: () => get('/admin/audit-logs', { page, limit: 20, search: search || undefined, action: actionFilter || undefined }),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const exportCSV = () => {
    const headers = 'Timestamp,User,Action,Entity,Entity ID,Details\n';
    const rows = logs.map((log: any) => `"${new Date(log.createdAt).toISOString()}","${log.user?.firstName || ''} ${log.user?.lastName || ''}","${log.action}","${log.entity}","${log.entityId || ''}","${(log.details || '').replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Audit Logs</h2>
        <button onClick={exportCSV} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map(a => (
          <button key={a} onClick={() => { setActionFilter(a); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full ${actionFilter === a ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{a || 'All'}</button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'createdAt', label: 'Timestamp', render: (val: string) => new Date(val).toLocaleString() },
          { key: 'user', label: 'User', render: (val: any) => val ? `${val.firstName || ''} ${val.lastName || ''}`.trim() || val.email || '-' : 'System' },
          { key: 'action', label: 'Action', render: (val: string) => <span className="badge-info">{val}</span> },
          { key: 'entity', label: 'Entity' },
          { key: 'entityId', label: 'Entity ID', render: (val: string) => val ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{val.slice(0, 8)}...</code> : '-' },
          { key: 'id', label: 'Details', render: (_: any, row: any) => row.details ? (
            <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="text-primary-600 hover:underline text-xs">
              {expandedId === row.id ? 'Hide' : 'View'} {expandedId === row.id ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />}
            </button>
          ) : '-'},
        ]}
        data={logs}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by user, action, entity..."
        emptyTitle="No audit logs"
        emptyDescription="Actions performed on the platform will appear here"
      />

      {expandedId && (
        <div className="card p-4 mt-4">
          {logs.filter((l: any) => l.id === expandedId).map((log: any) => (
            <div key={log.id}>
              <h4 className="font-medium text-sm mb-2">Details</h4>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">{JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}</pre>
              <p className="text-xs text-gray-400 mt-2">IP: {log.ipAddress || 'N/A'} | UA: {(log.userAgent || 'N/A').slice(0, 50)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}