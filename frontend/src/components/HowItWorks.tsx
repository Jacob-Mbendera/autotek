import { Search, ShoppingCart, CreditCard, Package, CheckCircle2 } from 'lucide-react';
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
    <section className="py-20 bg-gradient-to-b from-white via-teal-50/20 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent hidden lg:block"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <H2 className="text-4xl font-bold mb-4 animate-fade-in">How It Works</H2>
          <Body className="text-gray-600 max-w-2xl mx-auto text-lg">
            Get your auto parts in 4 simple steps
          </Body>
        </div>
        
        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200">
            <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse"></div>
            <div className="absolute top-1/2 left-2/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse animation-delay-2000"></div>
            <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse animation-delay-4000"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card 
                  key={step.number} 
                  variant="md" 
                  className="relative text-center group hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-3"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Progress indicator line (mobile) */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-20 -right-4 w-8 h-0.5 bg-teal-200 hidden md:block lg:hidden">
                      <div className="absolute right-0 top-1/2 w-2 h-2 bg-teal-500 rounded-full transform -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center p-6">
                    {/* Enhanced step number badge */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="relative">
                        <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 group-hover:shadow-teal-500/50 transition-all duration-300">
                          {step.number}
                        </div>
                        <div className="absolute inset-0 bg-teal-400 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"></div>
                      </div>
                    </div>
                    
                    {/* Enhanced icon */}
                    <div className="relative mb-6 mt-6">
                      <div className="h-20 w-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg group-hover:shadow-teal-200/50">
                        <Icon className="h-10 w-10 text-teal-600 group-hover:text-teal-700 transition-colors" />
                      </div>
                      <div className="absolute -inset-2 bg-teal-200 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                    </div>
                    
                    <H4 className="mb-3 text-lg font-bold group-hover:text-teal-600 transition-colors duration-300">{step.title}</H4>
                    <Body className="text-gray-600 text-sm leading-relaxed">{step.description}</Body>
                    
                    {/* Check mark on hover */}
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <CheckCircle2 className="h-6 w-6 text-teal-500 mx-auto animate-scale-in" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
