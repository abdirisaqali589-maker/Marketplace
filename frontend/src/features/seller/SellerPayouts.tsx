import React, { useState } from 'react';
import { Wallet, Plus, X, DollarSign } from 'lucide-react';
import { get, post } from '../../lib/api-enhanced';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import LoadingScreen from '../shared/LoadingScreen';
import toast from 'react-hot-toast';

export default function SellerPayouts() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: 0, method: 'MOBILE_MONEY', accountRef: '' });

  const { data: payoutData, isLoading } = useQuery({ queryKey: ['seller-payouts'], queryFn: () => get('/sellers/payouts') });
  const payouts = payoutData?.data || [];

  const requestPayout = useMutation({
    mutationFn: (data: any) => post('/sellers/payouts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-payouts'] }); toast.success('Payout requested'); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Request failed'),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Payouts</h2>
          <p className="text-sm text-gray-500">Manage your earnings and withdrawals</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Request Payout</button>
      </div>

      <DataTable
        columns={[
          { key: 'createdAt', label: 'Date', render: (val: string) => new Date(val).toLocaleDateString() },
          { key: 'amount', label: 'Amount', render: (val: number) => `${val?.toLocaleString()} TZS` },
          { key: 'method', label: 'Method' },
          { key: 'accountRef', label: 'Account' },
          { key: 'status', label: 'Status', render: (val: string) => {
            const styles: Record<string, string> = { PENDING: 'badge-warning', PAID: 'badge-success', REJECTED: 'badge-error' };
            return <span className={styles[val] || 'badge-neutral'}>{val}</span>;
          }},
        ]}
        data={payouts}
        emptyTitle="No payouts yet"
        emptyDescription="Request your first payout"
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Request Payout</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Method</label><select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="select-field"><option value="MOBILE_MONEY">Mobile Money</option><option value="BANK_TRANSFER">Bank Transfer</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Reference</label><input type="text" value={form.accountRef} onChange={e => setForm({ ...form, accountRef: e.target.value })} className="input-field" placeholder="Phone number or account number" /></div>
              <button onClick={() => requestPayout.mutate(form)} disabled={requestPayout.isPending || !form.amount || !form.accountRef} className="btn-primary w-full">{requestPayout.isPending ? 'Requesting...' : 'Request Payout'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}