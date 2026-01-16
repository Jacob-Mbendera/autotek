import { Package, Truck, Shield, Headphones } from 'lucide-react';
import { Card } from './ui/Card';
import { H3, BodySmall } from './ui/Typography';

interface TrustStat {
  icon: typeof Package;
  value: string;
  label: string;
}

const stats: TrustStat[] = [
  {
    icon: Package,
    value: '500+',
    label: 'Parts Available',
  },
  {
    icon: Truck,
    value: 'Fast',
    label: 'Delivery',
  },
  {
    icon: Shield,
    value: 'Secure',
    label: 'Payments',
  },
  {
    icon: Headphones,
    value: '24/7',
    label: 'Support',
  },
];

export const TrustIndicators = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} variant="sm" className="text-center hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                    <Icon className="h-6 w-6 text-teal-600" />
                  </div>
                  <H3 className="text-2xl font-bold text-teal-600 mb-1">{stat.value}</H3>
                  <BodySmall className="text-gray-600">{stat.label}</BodySmall>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
