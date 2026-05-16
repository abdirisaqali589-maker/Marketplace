import { CreditCard, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { usePublicConfig } from '../../lib/query-hooks';

const methodIcons: Record<string, JSX.Element> = {
  CARD: <CreditCard className="h-5 w-5" />,
  MOBILE_MONEY: <Smartphone className="h-5 w-5" />,
  BANK_TRANSFER: <Wallet className="h-5 w-5" />,
  CASH_ON_DELIVERY: <ShieldCheck className="h-5 w-5" />,
};

export default function CustomerPayments() {
  const { data: publicConfig } = usePublicConfig();
  const paymentConfig = publicConfig?.data?.['marketplace.payments'] || {};
  const methods = Array.isArray(paymentConfig.enabledMethods) ? paymentConfig.enabledMethods : ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'];
  const providers = Array.isArray(paymentConfig.providers) ? paymentConfig.providers : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payment Settings</h2>
        <p className="text-sm text-gray-500">Review available payment methods and connected checkout providers.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {methods.map((method: string) => {
          const linkedProviders = providers.filter((provider: any) => provider.method === method && provider.enabled);
          return (
            <div key={method} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-50 p-3 text-primary-600">{methodIcons[method] || <CreditCard className="h-5 w-5" />}</div>
                <div>
                  <p className="font-medium text-gray-900">{method.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500">{linkedProviders.length ? linkedProviders.map((provider: any) => provider.label).join(', ') : 'Marketplace managed'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold">Saved Payment Methods</h3>
        <p className="mt-2 text-sm text-gray-500">
          Card vaulting and mobile-money account linking should be handled by a PCI-compliant provider. This panel is ready for that integration once the provider keys and callbacks are connected.
        </p>
      </div>
    </div>
  );
}
