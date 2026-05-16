import React, { useState } from 'react';
import { Users, UserCheck, UserX, Shield, Eye, X } from 'lucide-react';
import { useAdminUsers } from '../../lib/query-hooks';
import { patch, post } from '../../lib/api-enhanced';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import DataTable from '../shared/DataTable';
import LoadingScreen from '../shared/LoadingScreen';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useAdminUsers({ page, limit: 15, search, role: roleFilter || undefined });
  const users = data?.data || [];
  const pagination = data?.pagination;

  const { data: rolesData } = useQuery({ queryKey: ['admin-roles'], queryFn: () => get('/admin/roles') });
  const roles = rolesData?.data || [];

  const toggleStatus = useMutation({
    mutationFn: (id: string) => patch(`/admin/users/${id}/toggle-status`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('User status toggled'); },
  });

  const assignRole = useMutation({
    mutationFn: ({ userId, roleId }: any) => post('/admin/assign-role', { userId, roleId }),
    onSuccess: () => { toast.success('Role assigned'); },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {['', 'CUSTOMER', 'SELLER', 'ADMIN'].map(r => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full ${roleFilter === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'firstName', label: 'Name', render: (_: any, row: any) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone', render: (val: string) => val || '-' },
          { key: 'role', label: 'Role', render: (val: string) => <span className="badge-info">{val}</span> },
          { key: 'isActive', label: 'Status', render: (val: boolean) => <span className={val ? 'badge-success' : 'badge-error'}>{val ? 'Active' : 'Banned'}</span> },
          { key: 'createdAt', label: 'Joined', render: (val: string) => new Date(val).toLocaleDateString() },
          { key: 'id', label: 'Actions', render: (_: any, row: any) => (
            <div className="flex gap-1">
              <button onClick={() => setSelectedUser(row)} className="p-1.5 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => toggleStatus.mutate(row.id)} className={`p-1.5 rounded ${row.isActive ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}>
                {row.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </button>
            </div>
          )},
        ]}
        data={users}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        emptyTitle="No users found"
      />

      {selectedUser && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">User Detail</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xl font-bold">
                  {selectedUser.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <p className="text-sm text-gray-500">{selectedUser.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="card p-3"><p className="text-gray-500">Role</p><p className="font-medium">{selectedUser.role}</p></div>
                <div className="card p-3"><p className="text-gray-500">Status</p><p className="font-medium">{selectedUser.isActive ? 'Active' : 'Banned'}</p></div>
                <div className="card p-3"><p className="text-gray-500">Verified</p><p className="font-medium">{selectedUser.isVerified ? 'Yes' : 'No'}</p></div>
                <div className="card p-3"><p className="text-gray-500">KYC</p><p className="font-medium">{selectedUser.kycStatus}</p></div>
              </div>
              {selectedUser.seller && (
                <div className="card p-3">
                  <p className="text-gray-500 text-sm">Seller</p>
                  <p className="font-medium">{selectedUser.seller.storeName}</p>
                  <p className="text-xs text-gray-400">KYC: {selectedUser.seller.kycStatus}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                <select onChange={(e) => assignRole.mutate({ userId: selectedUser.id, roleId: e.target.value })} className="select-field">
                  <option value="">Select role...</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}