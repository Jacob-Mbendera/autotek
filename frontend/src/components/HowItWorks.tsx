import { Search, ShoppingCart, CreditCard, Package } from 'lucide-react';
import { Card } from './ui/Card';
import { H2, H4, Body } from './ui/Typography';

interface Step {
  number: number;
  icon: typeof Search;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    icon: Search,
    title: 'Browse Products',
    description: 'Search our catalog or request a custom order for unavailable parts',
  },
  {
    number: 2,
    icon: ShoppingCart,
    title: 'Add to Cart',
    description: 'Select the parts you need and add them to your shopping cart',
  },
  {
    number: 3,
    icon: CreditCard,
    title: 'Checkout',
    description: 'Pay securely with Airtel Money or bank transfer',
  },
  {
    number: 4,
    icon: Package,
    title: 'Track Order',
    description: 'Monitor your order status and delivery in real-time',
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <H2 className="text-center mb-12 animate-fade-in">How It Works</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} variant="md" className="relative text-center hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center">
                  {/* Step number badge */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="h-8 w-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  {/* Icon */}
                  <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mb-4 mt-4">
                    <Icon className="h-8 w-8 text-teal-600" />
                  </div>
                  <H4 className="mb-2">{step.title}</H4>
                  <Body className="text-gray-600 text-sm">{step.description}</Body>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
