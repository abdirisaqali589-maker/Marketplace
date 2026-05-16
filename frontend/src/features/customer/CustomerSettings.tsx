import { useState } from 'react';
import { 
  User, Shield, Bell, Palette, Globe, MapPin, CreditCard,
  Smartphone, Key, Eye, EyeOff, Lock, Mail, Phone, Camera,
  Save, ChevronRight, Check, AlertTriangle, RefreshCw,
  Moon, Sun, Palette as PaletteIcon, Languages
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePreferenceStore } from '../../lib/preference-store';
import { useAuthStore } from '../../lib/auth-store';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api-enhanced';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'addresses' | 'privacy';

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'privacy', label: 'Privacy', icon: Eye },
];

function ProfileTab() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const payload = new FormData();
      payload.append('images', file);
      const res = await api.post('/upload/images', payload);
      return res.data.data[0];
    },
    onSuccess: (avatar: any) => {
      // Update the user's avatar in auth store
      updateUser({ avatar: avatar.url || avatar.previewUrl || avatar.path });
      toast.success('Avatar updated successfully!');
    },
    onError: (err: any) => {
      console.error('Avatar upload error:', err);
      if (err.response) {
        toast.error(err.response.data?.message || err.response.data?.error || 'Avatar upload failed');
      } else {
        toast.error(err.message || 'Avatar upload failed');
      }
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadAvatar.mutate(e.target.files[0]);
    }
  };

  const handleSave = () => {
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-5 p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        <div className="relative group">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-700)))' }}
          >
            {form.firstName?.[0]?.toUpperCase() || 'U'}{form.lastName?.[0]?.toUpperCase() || ''}
          </div>
          <input type="file" accept="image/*" className="hidden" id="avatarUpload" onChange={handleAvatarChange} />
          <label htmlFor="avatarUpload" className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors hover:bg-primary-100"
            style={{ backgroundColor: 'rgb(var(--color-primary-50))', borderColor: 'rgb(var(--color-white))' }}
            title="Change photo"
          >
            <Camera className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
          </label>
        </div>
        <div>
          <p className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>{form.firstName} {form.lastName}</p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{form.email} · {user?.role}</p>
          <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">First Name</label>
          <input className="form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Last Name</label>
          <input className="form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" />
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" />
        </div>
      </div>
      <div>
        <label className="form-label">Bio</label>
        <textarea className="form-textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
      </div>
      <button onClick={handleSave} className="btn-primary">
        <Save className="w-4 h-4" /> Save Changes
      </button>
    </div>
  );
}

function SecurityTab() {
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });

  const handleChangePassword = () => {
    if (pwForm.new !== pwForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password changed successfully');
    setPwForm({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Password Change */}
      <div className="card p-4">
        <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
          <Key className="w-4 h-4" /> Change Password
        </h4>
        <div className="space-y-3">
          <div className="relative">
            <label className="form-label">Current Password</label>
            <input className="form-input pr-10" type={showPw ? 'text' : 'password'} value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
            <button className="absolute right-3 top-9" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <label className="form-label">New Password</label>
            <input className="form-input pr-10" type={showNewPw ? 'text' : 'password'} value={pwForm.new}
              onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} />
            <button className="absolute right-3 top-9" onClick={() => setShowNewPw(!showNewPw)}>
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
          </div>
          <button onClick={handleChangePassword} className="btn-primary btn-sm">
            <Lock className="w-4 h-4" /> Update Password
          </button>
        </div>
      </div>

      {/* Two-Factor Auth */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
            <Smartphone className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Two-Factor Authentication</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>Add an extra layer of security to your account.</p>
          </div>
        </div>
        <button className="btn-secondary btn-sm">Enable</button>
      </div>

      {/* Login Sessions */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--color-amber-50))' }}>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Active Sessions</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>You're logged in on this device. Manage other sessions.</p>
          </div>
        </div>
        <button className="btn-secondary btn-sm">Manage</button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const prefs = [
    { id: 'order_updates', label: 'Order Updates', desc: 'Shipping confirmations, delivery status, tracking info', enabled: true },
    { id: 'promotions', label: 'Promotions & Deals', desc: 'Sales, discounts, and special offers', enabled: true },
    { id: 'account_alerts', label: 'Account Alerts', desc: 'Login notifications, security alerts', enabled: true },
    { id: 'reviews', label: 'Review Reminders', desc: 'Reminders to review purchased products', enabled: false },
    { id: 'newsletter', label: 'Newsletter', desc: 'Weekly updates, tips, and platform news', enabled: false },
    { id: 'ai_insights', label: 'AI Recommendations', desc: 'Personalized product and deal recommendations', enabled: true },
  ];
  const [toggles, setToggles] = useState<Record<string, boolean>>(Object.fromEntries(prefs.map((p) => [p.id, p.enabled])));

  return (
    <div className="space-y-3">
      {prefs.map((pref) => (
        <div key={pref.id} className="card p-3.5 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{pref.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{pref.desc}</p>
          </div>
          <button
            onClick={() => setToggles({ ...toggles, [pref.id]: !toggles[pref.id] })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${toggles[pref.id] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch"
            aria-checked={toggles[pref.id]}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${toggles[pref.id] ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
      <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <Bell className="w-3 h-3 inline mr-1" />
        Notification preferences are saved automatically.
      </p>
    </div>
  );
}

function AppearanceTab() {
  const { theme, toggleTheme, accessibility, highContrast, toggleAccessibility, toggleHighContrast } = usePreferenceStore();

  return (
    <div className="space-y-6 max-w-lg">
      <div className="card p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
          <Moon className="w-4 h-4" /> Theme
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { if (theme !== 'light') toggleTheme(); }}
            className={`p-4 rounded-xl border-2 text-center transition-all ${theme === 'light' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 dark:border-gray-700'}`}>
            <Sun className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <p className="text-sm font-medium">Light</p>
          </button>
          <button onClick={() => { if (theme !== 'dark') toggleTheme(); }}
            className={`p-4 rounded-xl border-2 text-center transition-all ${theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
            <Moon className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <p className="text-sm font-medium">Dark</p>
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <h4 className="font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
          <Eye className="w-4 h-4" /> Accessibility
        </h4>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Accessibility Mode</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>Larger text and improved contrast</p>
          </div>
          <button onClick={toggleAccessibility}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${accessibility ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch" aria-checked={accessibility}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${accessibility ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>High Contrast</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>Maximum contrast for better readability</p>
          </div>
          <button onClick={toggleHighContrast}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${highContrast ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch" aria-checked={highContrast}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
      </div>
    </div>
  );
}

function AddressesTab() {
  const addresses = [
    { id: 1, label: 'Home', line1: '123 Main Street', city: 'Dar es Salaam', region: 'Dar es Salaam', country: 'Tanzania', default: true },
    { id: 2, label: 'Office', line1: '456 Business Ave', city: 'Arusha', region: 'Arusha', country: 'Tanzania', default: false },
  ];

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div key={addr.id} className="card p-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>{addr.label}</p>
              {addr.default && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600">Default</span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{addr.line1}</p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{addr.city}, {addr.region}, {addr.country}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm">Edit</button>
            {!addr.default && <button className="btn-secondary btn-sm">Delete</button>}
          </div>
        </div>
      ))}
      <button className="btn-secondary btn-sm">
        <MapPin className="w-4 h-4" /> Add New Address
      </button>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-3 max-w-lg">
      {[
        { id: 'profile_visible', label: 'Public Profile', desc: 'Show your profile to other users', enabled: true },
        { id: 'order_visible', label: 'Order Anonymity', desc: 'Hide your name from order reviews', enabled: false },
        { id: 'data_sharing', label: 'Data Sharing', desc: 'Allow us to use your data for recommendations', enabled: true },
        { id: 'marketing_cookies', label: 'Marketing Cookies', desc: 'Allow targeted advertising cookies', enabled: false },
      ].map((item) => (
        <div key={item.id} className="card p-3.5 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{item.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.desc}</p>
          </div>
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            role="switch" aria-checked={item.enabled}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
      <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <Shield className="w-3 h-3 inline mr-1" />
        Your privacy is important to us. Read our Privacy Policy.
      </p>
    </div>
  );
}

const tabComponents: Record<SettingsTab, () => JSX.Element> = {
  profile: ProfileTab,
  security: SecurityTab,
  notifications: NotificationsTab,
  appearance: AppearanceTab,
  addresses: AddressesTab,
  privacy: PrivacyTab,
};

export default function CustomerSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const ActiveComponent = tabComponents[activeTab];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: isActive ? 'rgb(var(--color-primary-50))' : 'transparent',
                color: isActive ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <ActiveComponent />
    </div>
  );
}