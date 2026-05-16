import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, CreditCard, Banknote, Smartphone, Truck, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart, useCreateOrder, usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import LoadingScreen from '../shared/LoadingScreen';

const steps = ['Shipping', 'Payment', 'Review'];

const paymentMethods = [
  { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, or other cards' },
  { id: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, desc: 'M-Pesa, Tigo Pesa, Airtel Money' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Banknote, desc: 'Direct bank transfer' },
  { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', icon: Truck, desc: 'Pay when you receive' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cartData, isLoading } = useCart();
  const { data: publicConfig } = usePublicConfig();
  const createOrder = useCreateOrder();
  const [step, setStep] = useState(0);
  const [shipping, setShipping] = useState({ fullName: '', phone: '', street: '', city: '', state: '', zipCode: '', country: 'TZ' });
  const [paymentMethod, setPaymentMethod] = useState('');

  const cart = cartData?.data;
  const items = cart?.items || [];
  const paymentConfig = publicConfig?.data?.['marketplace.payments'] || {};
  const enabledMethods = Array.isArray(paymentConfig.enabledMethods) ? paymentConfig.enabledMethods : paymentMethods.map((method) => method.id);
  const enabledProviders = Array.isArray(paymentConfig.providers) ? paymentConfig.providers.filter((provider: any) => provider.enabled) : [];
  const visiblePaymentMethods = paymentMethods.filter((method) => enabledMethods.includes(method.id));

  useEffect(() => {
    if (!isLoading && items.length === 0) {
      navigate('/cart');
    }
  }, [isLoading, items.length, navigate]);

  if (isLoading) return <LoadingScreen />;
  if (!items.length) return null;

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * item.quantity, 0);

  const handlePlaceOrder = () => {
    createOrder.mutate({
      shippingAddress: shipping,
      paymentMethod,
    }, { onSuccess: () => navigate('/account/orders') });
  };

  return (
    <div className="page-container max-w-4xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>Checkout</h1>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${i <= step ? '' : ''}`} style={{ color: i <= step ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: i <= step ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-active))',
                  color: i <= step ? 'white' : 'rgb(var(--color-text-muted))',
                }}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 min-w-8 transition-colors"
                style={{ backgroundColor: i < step ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-active))' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Shipping */}
      {step === 0 && (
        <div className="card p-6 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Shipping Address</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" value={shipping.fullName} onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })} className="input-field" />
            <input type="tel" placeholder="Phone Number" value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} className="input-field" />
            <input type="text" placeholder="Street Address" value={shipping.street} onChange={(e) => setShipping({ ...shipping, street: e.target.value })} className="input-field" />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="City" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} className="input-field" />
              <input type="text" placeholder="State" value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="ZIP Code" value={shipping.zipCode} onChange={(e) => setShipping({ ...shipping, zipCode: e.target.value })} className="input-field" />
              <input type="text" placeholder="Country" value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} className="input-field" />
            </div>
            <button onClick={() => setStep(1)} disabled={!shipping.fullName || !shipping.phone || !shipping.street || !shipping.city} className="btn-primary w-full">
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 1 && (
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Payment Method</h2>
          <div className="space-y-3">
            {visiblePaymentMethods.map((pm) => {
              const providers = enabledProviders.filter((provider: any) => provider.method === pm.id);
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className="card p-4 w-full flex items-center gap-4 text-left transition-colors"
                  style={{
                    borderColor: paymentMethod === pm.id ? 'rgb(var(--color-primary-600))' : '',
                    boxShadow: paymentMethod === pm.id ? '0 0 0 2px rgb(var(--color-primary-600) / 0.2)' : '',
                  }}
                >
                  <pm.icon
                    className="w-8 h-8"
                    style={{ color: paymentMethod === pm.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))' }}
                  />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{pm.label}</p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {providers.length ? providers.map((provider: any) => provider.label).join(', ') : pm.desc}
                    </p>
                  </div>
                  {paymentMethod === pm.id && <Check className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-600))' }} />}
                </button>
              );
            })}
            {visiblePaymentMethods.length === 0 && (
              <div className="card p-4 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No payment methods are enabled right now.</div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(0)} className="btn-secondary"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back</button>
            <button onClick={() => setStep(2)} disabled={!paymentMethod} className="btn-primary flex-1">Continue to Review</button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Order Summary</h2>
            <div className="card p-4 space-y-3 mb-4">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                    {item.product?.images?.[0]?.url ? (
                      <img src={assetUrl(item.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className="w-6 h-6 m-3" style={{ color: 'rgb(var(--color-text-disabled))' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1" style={{ color: 'rgb(var(--color-text))' }}>{item.product?.title}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {(item.unitPrice * item.quantity)?.toLocaleString()} TZS
                  </p>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-2" style={{ color: 'rgb(var(--color-text))' }}>Shipping To</h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{shipping.fullName} - {shipping.phone}</p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{shipping.street}, {shipping.city}{shipping.state ? `, ${shipping.state}` : ''}</p>
            </div>
          </div>
          <div>
            <div className="card p-6 sticky top-24">
              <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Total</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Subtotal</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{subtotal.toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Shipping</span>
                  <span style={{ color: 'rgb(var(--color-accent-600))' }}>Free</span>
                </div>
                <div className="pt-3 flex justify-between text-lg" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
                  <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Total</span>
                  <span className="font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{subtotal.toLocaleString()} TZS</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="btn-secondary">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button onClick={handlePlaceOrder} disabled={createOrder.isPending} className="btn-primary flex-1">
                  {createOrder.isPending ? 'Placing Order...' : 'Place Order'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}