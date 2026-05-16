import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, PackageCheck, Headphones, Store, Star, ShoppingBag, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { data: publicConfig } = usePublicConfig();
  const identity = publicConfig?.data?.['site.identity'] || {};
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const name = identity.name || 'MarketPlace';
  const logoUrl = identity.logoUrl || platformAssets.logoUrl;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Password strength calculation
  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/5' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: 'w-2/5' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: 'w-3/5' };
    if (score <= 4) return { label: 'Strong', color: 'bg-lime-500', width: 'w-4/5' };
    return { label: 'Very strong', color: 'bg-green-500', width: 'w-full' };
  };

  const passwordsMatch = form.password === form.confirmPassword;
  const passwordTouched = form.password.length > 0;
  const confirmTouched = form.confirmPassword.length > 0;
  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!form.email && !form.phone) {
      toast.error('Email or phone is required');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
      };
      if (form.email) payload.email = form.email;
      if (form.phone) payload.phone = form.phone;

      const res = await api.post('/auth/register', payload);
      toast.success('Registration successful! Check your phone/email for OTP.');
      navigate('/login');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed';
      const errors = err.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors).flat()[0];
        toast.error(firstError as string);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-950 via-gray-900 to-primary-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(234,88,12,.12),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(22,163,74,.08),transparent_40%)]" />

        <div className="relative flex flex-col justify-between p-12 w-full">
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

          <div className="space-y-10">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Join the marketplace<br />
                <span className="text-primary-300">start selling today</span>
              </h1>
              <p className="mt-4 text-lg text-gray-300 max-w-lg leading-relaxed">
                Create your free account and unlock access to thousands of buyers, powerful seller tools, and a seamless shopping experience.
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-4 max-w-lg">
              {[
                { icon: Store, color: 'text-accent-400', text: 'Create your store in minutes — no fees to start' },
                { icon: ShoppingBag, color: 'text-primary-400', text: 'List unlimited products with rich media' },
                { icon: ShieldCheck, color: 'text-green-400', text: 'Trade assurance & secure payment processing' },
                { icon: PackageCheck, color: 'text-blue-400', text: 'Order management & real-time tracking' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <item.icon className={`h-5 w-5 ${item.color} mt-0.5 shrink-0`} />
                  <span className="text-gray-300 text-sm">{item.text}</span>
                </div>
              ))}
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

          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side — Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="255712345678"
                />
                <p className="text-xs text-gray-400 mt-1">Include country code (e.g. 255 for Tanzania)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength bar */}
                {passwordTouched && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.width} rounded-full transition-all duration-300`} />
                    </div>
                    <p className={`text-xs mt-1 ${
                      strength.label === 'Weak' ? 'text-red-500' :
                      strength.label === 'Fair' ? 'text-orange-500' :
                      strength.label === 'Good' ? 'text-yellow-600' :
                      strength.label === 'Strong' ? 'text-lime-600' :
                      'text-green-600'
                    }`}>{strength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="Repeat your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmTouched && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs text-green-600">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs text-red-500">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  I agree to the <Link to="/pages/terms" className="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</Link> and <Link to="/pages/privacy" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</Link>
                </span>
              </label>

              <button type="submit" disabled={loading || !acceptTerms} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                By signing up, you'll receive an OTP to verify your account
              </p>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          {/* Mobile trust badges */}
          <div className="lg:hidden mt-6 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <ShieldCheck className="h-4 w-4 text-primary-600 mx-auto mb-1" />
              <span className="text-gray-500 dark:text-gray-400">Protected</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <Store className="h-4 w-4 text-primary-600 mx-auto mb-1" />
              <span className="text-gray-500 dark:text-gray-400">Seller tools</span>
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