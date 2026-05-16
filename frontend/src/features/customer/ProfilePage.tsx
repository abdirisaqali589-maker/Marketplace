import React, { useState } from 'react';
import { User, MapPin, Bell, Save, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { get, put, post, del } from '../../lib/api-enhanced';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LoadingScreen from '../shared/LoadingScreen';

type Tab = 'profile' | 'addresses' | 'preferences';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile form
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Addresses
  const { data: addrData, isLoading: addrLoading } = useQuery({ queryKey: ['addresses'], queryFn: () => get('/users/addresses') });
  const addresses = addrData?.data || [];
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: '', phone: '', street: '', city: '', state: '', zipCode: '', country: 'TZ' });
  const [editingAddr, setEditingAddr] = useState<string | null>(null);

  // Preferences
  const { data: prefData } = useQuery({ queryKey: ['preferences'], queryFn: () => get('/users/preferences') });
  const pref = prefData?.data || {};
  const [prefForm, setPrefForm] = useState({ language: pref.language || 'en', currency: pref.currency || 'TZS', smsEnabled: pref.smsEnabled ?? true, emailEnabled: pref.emailEnabled ?? true, pushEnabled: pref.pushEnabled ?? true });

  // Mutations
  const updateProfile = useMutation({
    mutationFn: (data: any) => put('/users/profile', data),
    onSuccess: (res: any) => { updateUser(res.data); toast.success('Profile updated'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => put('/auth/change-password', data),
    onSuccess: () => { toast.success('Password changed'); setShowPasswordForm(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Password change failed'),
  });

  const saveAddress = useMutation({
    mutationFn: (data: any) => editingAddr ? put(`/users/addresses/${editingAddr}`, data) : post('/users/addresses', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address saved'); setShowAddrForm(false); setEditingAddr(null); },
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => del(`/users/addresses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address deleted'); },
  });

  const updatePrefs = useMutation({
    mutationFn: (data: any) => put('/users/preferences', data),
    onSuccess: () => { toast.success('Preferences saved'); },
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { key: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4" /> },
    { key: 'preferences', label: 'Preferences', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="page-container max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
              <button onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending} className="btn-primary"><Save className="w-4 h-4" /> {updateProfile.isPending ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Security</h2>
            {!showPasswordForm ? (
              <button onClick={() => setShowPasswordForm(true)} className="btn-secondary">Change Password</button>
            ) : (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-field" /></div>
                <div className="flex gap-2">
                  <button onClick={() => changePassword.mutate(passwordForm)} disabled={changePassword.isPending} className="btn-primary btn-sm">{changePassword.isPending ? 'Changing...' : 'Update Password'}</button>
                  <button onClick={() => setShowPasswordForm(false)} className="btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Addresses Tab */}
      {tab === 'addresses' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingAddr(null); setAddrForm({ label: '', phone: '', street: '', city: '', state: '', zipCode: '', country: 'TZ' }); setShowAddrForm(true); }} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Address</button>
          </div>
          {addrLoading ? <LoadingScreen /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr: any) => (
                <div key={addr.id} className={`card p-4 relative ${addr.isDefault ? 'ring-2 ring-primary-500' : ''}`}>
                  {addr.isDefault && <span className="absolute top-2 right-2 badge-info">Default</span>}
                  <p className="font-medium text-gray-900">{addr.label || 'Address'}</p>
                  <p className="text-sm text-gray-600">{addr.street}</p>
                  <p className="text-sm text-gray-600">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zipCode}</p>
                  <p className="text-sm text-gray-600">{addr.phone}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditingAddr(addr.id); setAddrForm(addr); setShowAddrForm(true); }} className="btn-secondary btn-sm">Edit</button>
                    <button onClick={() => deleteAddress.mutate(addr.id)} className="btn-danger btn-sm"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddrForm && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowAddrForm(false)}>
              <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h3 className="font-semibold mb-4">{editingAddr ? 'Edit' : 'Add'} Address</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Label (Home, Work)" value={addrForm.label} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })} className="input-field" />
                  <input type="tel" placeholder="Phone" value={addrForm.phone} onChange={e => setAddrForm({ ...addrForm, phone: e.target.value })} className="input-field" />
                  <input type="text" placeholder="Street" value={addrForm.street} onChange={e => setAddrForm({ ...addrForm, street: e.target.value })} className="input-field" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="City" value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} className="input-field" />
                    <input type="text" placeholder="State" value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="ZIP Code" value={addrForm.zipCode} onChange={e => setAddrForm({ ...addrForm, zipCode: e.target.value })} className="input-field" />
                    <input type="text" placeholder="Country" value={addrForm.country} onChange={e => setAddrForm({ ...addrForm, country: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => saveAddress.mutate(addrForm)} disabled={saveAddress.isPending} className="btn-primary flex-1">{saveAddress.isPending ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setShowAddrForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {tab === 'preferences' && (
        <div className="card p-6 max-w-lg">
          <h2 className="font-semibold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-gray-900">Email Notifications</p><p className="text-sm text-gray-500">Order updates, promotions via email</p></div>
              <button onClick={() => setPrefForm({ ...prefForm, emailEnabled: !prefForm.emailEnabled })} className={`w-12 h-6 rounded-full transition-colors ${prefForm.emailEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${prefForm.emailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-gray-900">SMS Notifications</p><p className="text-sm text-gray-500">Delivery updates via SMS</p></div>
              <button onClick={() => setPrefForm({ ...prefForm, smsEnabled: !prefForm.smsEnabled })} className={`w-12 h-6 rounded-full transition-colors ${prefForm.smsEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${prefForm.smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-gray-900">Push Notifications</p><p className="text-sm text-gray-500">In-app browser notifications</p></div>
              <button onClick={() => setPrefForm({ ...prefForm, pushEnabled: !prefForm.pushEnabled })} className={`w-12 h-6 rounded-full transition-colors ${prefForm.pushEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${prefForm.pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <button onClick={() => updatePrefs.mutate(prefForm)} disabled={updatePrefs.isPending} className="btn-primary"><Save className="w-4 h-4" /> Save Preferences</button>
          </div>
        </div>
      )}
    </div>
  );
}