import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, TrendingUp, ShieldCheck, DollarSign, Package, BarChart3, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { post } from '../../lib/api-enhanced';
import { useAuthStore } from '../../lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api-enhanced';
import toast from 'react-hot-toast';
import LoadingScreen from '../shared/LoadingScreen';

export default function BecomeSellerPage() {
  const navigate = useNavigate();
  const { user, login } = useAuthStore();
  const [step, setStep] = useState<'landing' | 'form' | 'success'>('landing');
  const [form, setForm] = useState({ storeName: '', storeSlug: '', storeDescription: '', storeLocation: '', sellerType: 'INDIVIDUAL' });
  const [submitting, setSubmitting] = useState(false);

  // Check if user already has seller profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['seller-profile-check'],
    queryFn: () => get('/sellers/profile').catch(() => null),
    retry: false,
  });

  if (profileLoading) return <LoadingScreen />;
  if (profileData?.data) {
    return (
      <div className="page-container max-w-2xl text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">You're Already a Seller!</h1>
        <p className="text-gray-500 mb-8">Your store <strong>{profileData.data.storeName}</strong> is already set up and ready to go.</p>
        <Link to="/seller" className="btn-primary text-lg px-8 py-3">Go to Dashboard <ArrowRight className="inline w-5 h-5 ml-2" /></Link>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handleSubmit = async () => {
    if (!form.storeName || !form.storeSlug) {
      toast.error('Store name and slug are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/sellers', form);
      if (res.success) {
        if (res.data?.user && res.data?.accessToken && res.data?.refreshToken) {
          login(res.data.user, res.data.accessToken, res.data.refreshToken);
        }
        toast.success('Welcome to the seller community!');
        setStep('success');
        setTimeout(() => navigate('/seller'), 2000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="page-container max-w-lg text-center py-20">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold text-gray-900 mb-3">Store Created!</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-gray-500 mb-4">Your store <strong>{form.storeName}</strong> is now live.</motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Link to="/seller" className="btn-primary text-lg px-8 py-3">Go to Dashboard <ArrowRight className="inline w-5 h-5 ml-2" /></Link>
        </motion.div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="page-container max-w-lg py-12">
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <motion.button variants={itemVariants} onClick={() => setStep('landing')} className="btn-secondary btn-sm mb-6">← Back</motion.button>
          <motion.h1 variants={itemVariants} className="text-2xl font-bold mb-6">Create Your Store</motion.h1>
          <motion.div variants={itemVariants} className="card p-6 space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label><input type="text" value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value, storeSlug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} className="input-field" placeholder="My Awesome Store" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Store Slug *</label><input type="text" value={form.storeSlug} onChange={e => setForm({ ...form, storeSlug: e.target.value })} className="input-field" placeholder="my-awesome-store" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={form.storeDescription} onChange={e => setForm({ ...form, storeDescription: e.target.value })} className="textarea-field" rows={3} placeholder="Tell customers about your store..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" value={form.storeLocation} onChange={e => setForm({ ...form, storeLocation: e.target.value })} className="input-field" placeholder="Dar es Salaam" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Seller Type</label><select value={form.sellerType} onChange={e => setForm({ ...form, sellerType: e.target.value })} className="select-field"><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></div>
            <button onClick={handleSubmit} disabled={submitting || !form.storeName} className="btn-primary w-full py-3">{submitting ? 'Creating...' : 'Create Store'}</button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold mb-4">Start Selling in Minutes</motion.h1>
            <motion.p variants={itemVariants} className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">Join thousands of sellers and reach millions of customers across Tanzania. No upfront fees, no monthly charges.</motion.p>
            <motion.button variants={itemVariants} onClick={() => setStep('form')} className="bg-white text-primary-700 font-semibold px-10 py-4 rounded-full hover:bg-gray-100 transition shadow-lg text-lg">
              Open Your Store Free <ArrowRight className="inline w-5 h-5 ml-2" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" variants={containerVariants} viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'Reach Millions', desc: 'Access our growing customer base across Tanzania. Your products visible to thousands of active buyers daily.', color: 'bg-blue-500' },
              { icon: BarChart3, title: 'Powerful Dashboard', desc: 'Manage products, track orders, view analytics, and handle everything from one easy-to-use dashboard.', color: 'bg-green-500' },
              { icon: ShieldCheck, title: 'Fast & Secure', desc: 'Get paid quickly with our secure payment system. Mobile money and bank transfer payouts available.', color: 'bg-purple-500' },
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants} className="card p-8 text-center hover:shadow-lg transition-shadow">
                <div className={`w-16 h-16 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-4`}><item.icon className="w-8 h-8 text-white" /></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <motion.div initial="hidden" whileInView="visible" variants={containerVariants} viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Register', desc: 'Create your account in seconds', icon: Users },
              { step: '2', title: 'Create Store', desc: 'Set up your store profile', icon: Store },
              { step: '3', title: 'List Products', desc: 'Add products with photos', icon: Package },
              { step: '4', title: 'Start Selling', desc: 'Receive orders and grow', icon: TrendingUp },
            ].map((item, i) => (
              <motion.div key={i} variants={itemVariants} className="text-center">
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary-700 font-bold text-xl">{item.step}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Commission Rates */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Simple & Transparent Fees</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left font-medium text-gray-500">Category</th><th className="px-6 py-3 text-right font-medium text-gray-500">Commission</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { cat: 'Electronics', rate: '3%' },
                  { cat: 'Fashion', rate: '5%' },
                  { cat: 'Home & Living', rate: '4%' },
                  { cat: 'Sports & Outdoors', rate: '4%' },
                  { cat: 'All Other Categories', rate: '5%' },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50"><td className="px-6 py-3 text-gray-900">{item.cat}</td><td className="px-6 py-3 text-right font-semibold text-primary-600">{item.rate}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-gray-400 mt-4">No listing fees. No monthly subscriptions. Pay only when you sell.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: 'How do I get paid?', a: 'Payments are sent directly to your mobile money account or bank account within 2 business days after order delivery confirmation.' },
              { q: 'Is there a limit on products?', a: 'No! List as many products as you want. There are no listing fees or limits on inventory.' },
              { q: 'How do I handle shipping?', a: 'You set your own shipping policies and rates. We provide tracking integration with major couriers.' },
              { q: 'Can I customize my store?', a: 'Yes! Add your logo, banner, description, and policies to make your store unique.' },
            ].map((item, i) => (
              <details key={i} className="card p-4 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <ArrowRight className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl text-primary-100 mb-8">Join thousands of successful sellers on MarketPlace</p>
          <button onClick={() => setStep('form')} className="bg-white text-primary-700 font-semibold px-10 py-4 rounded-full hover:bg-gray-100 transition shadow-lg text-lg">
            Open Your Store Free <ArrowRight className="inline w-5 h-5 ml-2" />
          </button>
        </div>
      </section>
    </div>
  );
}
