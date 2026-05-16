import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, PackageCheck, Headphones, Store, Star, ShoppingBag, ArrowRight, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { data: publicConfig } = usePublicConfig();
  const oauthProviders = (publicConfig?.data?.['marketplace.auth']?.oauthProviders || []).filter((provider: any) => provider.enabled);
  const identity = publicConfig?.data?.['site.identity'] || {};
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const name = identity.name || 'MarketPlace';
  const logoUrl = identity.logoUrl || platformAssets.logoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const identifier = email.trim();
      const res = await api.post('/auth/login', identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password });
      const { user, accessToken, refreshToken } = res.data.data;
      login(user, accessToken, refreshToken);
      toast.success('Login successful!');
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-950 via-gray-900 to-primary-900 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(234,88,12,.12),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(22,163,74,.08),transparent_40%)]" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          {/* Logo + Name */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3 mb-12">
              {logoUrl ? (
                <img src={assetUrl(logoUrl)} alt={name} className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
                  <span className="text-white font-bold text-lg">{name[0]}</span>
                </div>
              )}
              <span className="text-2xl font-bold text-white tracking-tight">{name}</span>
            </Link>
          </div>

          {/* Center Content */}
          <div className="space-y-10">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Source smarter,<br />
                <span className="text-primary-300">sell faster</span>
              </h1>
              <p className="mt-4 text-lg text-gray-300 max-w-lg leading-relaxed">
                {identity.description || 'A multi-vendor marketplace for secure buying, seller operations, order tracking, and configurable platform integrations.'}
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <ShieldCheck className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Trade assurance</p>
                  <p className="text-xs text-gray-400 mt-0.5">Protected payments & orders</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <PackageCheck className="h-5 w-5 text-primary-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Ready to ship</p>
                  <p className="text-xs text-gray-400 mt-0.5">Fast dispatch & tracking</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <Store className="h-5 w-5 text-accent-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Seller tools</p>
                  <p className="text-xs text-gray-400 mt-0.5">Open your store today</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <Headphones className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">24/7 support</p>
                  <p className="text-xs text-gray-400 mt-0.5">Help anytime you need</p>
                </div>
              </div>
            </div>

            {/* Trust Stats */}
            <div className="flex items-center gap-8 text-sm">
              <div>
                <p className="text-2xl font-bold text-white">10K+</p>
                <p className="text-gray-400 text-xs mt-0.5">Active buyers</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-gray-400 text-xs mt-0.5">Verified sellers</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <p className="text-2xl font-bold text-white">4.8</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />)}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2">
              {logoUrl ? (
                <img src={assetUrl(logoUrl)} alt={name} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{name[0]}</span>
                </div>
              )}
              <span className="text-xl font-bold text-gray-900 dark:text-white">{name}</span>
            </Link>
          </div>

          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="hidden lg:block w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary-600/20">
                <ShoppingBag className="text-white h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account to continue</p>
            </div>

            {oauthProviders.length > 0 && (
              <div className="mb-6">
                <div className="grid gap-2">
                  {oauthProviders.map((provider: any) => (
                    <a
                      key={provider.id}
                      href={provider.authUrl || `/api/auth/oauth/${provider.id}`}
                      className="btn-secondary w-full justify-center"
                    >
                      <Layers className="w-4 h-4" />
                      Continue with {provider.label}
                    </a>
                  ))}
                </div>
                <div className="relative my-6 text-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-gray-800" />
                  <span className="relative bg-white dark:bg-gray-950 px-3 text-xs font-medium uppercase text-gray-400 dark:text-gray-500">or sign in with email</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email or Phone
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500" />
                  <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>

          {/* Trust badges on mobile */}
          <div className="lg:hidden mt-6 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <ShieldCheck className="h-4 w-4 text-primary-600 mx-auto mb-1" />
              <span className="text-gray-500 dark:text-gray-400">Protected</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <PackageCheck className="h-4 w-4 text-primary-600 mx-auto mb-1" />
              <span className="text-gray-500 dark:text-gray-400">Fast ship</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <Headphones className="h-4 w-4 text-primary-600 mx-auto mb-1" />
              <span className="text-gray-500 dark:text-gray-400">Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}