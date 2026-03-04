import { useState, useEffect, useRef } from 'react';
import { Package, Truck, Shield, Headphones } from 'lucide-react';
import { Card } from './ui/Card';
import { H3, BodySmall } from './ui/Typography';

interface TrustStat {
  icon: typeof Package;
  value: number | string;
  label: string;
  suffix?: string;
  isNumber?: boolean;
}

const stats: TrustStat[] = [
  {
    icon: Package,
    value: 500,
    label: 'Parts Available',
    suffix: '+',
    isNumber: true,
  },
  {
    icon: Truck,
    value: 'Fast',
    label: 'Delivery',
    isNumber: false,
  },
  {
    icon: Shield,
    value: 'Secure',
    label: 'Payments',
    isNumber: false,
  },
  {
    icon: Headphones,
    value: '24/7',
    label: 'Support',
    isNumber: false,
  },
];

// Count up animation hook
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const startTime = Date.now();
            const animate = () => {
              const now = Date.now();
              const progress = Math.min((now - startTime) / duration, 1);
              const easeOutQuart = 1 - Math.pow(1 - progress, 4);
              setCount(Math.floor(start + (end - start) * easeOutQuart));
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setCount(end);
              }
            };
            animate();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [end, duration, start, hasAnimated]);

  return { count, elementRef };
};

export const TrustIndicators = () => {
  const { count: partsCount, elementRef: partsRef } = useCountUp(500, 2000);

  return (
    <section className="py-16 bg-gradient-to-b from-white via-teal-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const displayValue = stat.isNumber && typeof stat.value === 'number' 
              ? (index === 0 ? partsCount : stat.value)
              : stat.value;
            
            return (
              <Card 
                key={index} 
                variant="sm" 
                className="text-center group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-teal-200 bg-white/80 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center p-6">
                  <div className="relative mb-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-teal-200/50">
                      <Icon className="h-7 w-7 text-teal-600 group-hover:text-teal-700 transition-colors" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                  </div>
                  <H3 
                    ref={index === 0 ? partsRef : undefined}
                    className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent mb-2 animate-count-up"
                  >
                    {displayValue}{stat.suffix || ''}
                  </H3>
                  <BodySmall className="text-gray-600 font-medium">{stat.label}</BodySmall>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
