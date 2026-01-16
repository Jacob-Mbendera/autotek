import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { H2, H4, BodySmall } from './ui/Typography';

interface Category {
  id: string;
  name: string;
  image: string;
  count: string;
  href: string;
}

const categories: Category[] = [
  {
    id: 'engine',
    name: 'Engine Parts',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
    count: '150+ Products',
    href: '/products?category=engine',
  },
  {
    id: 'brakes',
    name: 'Brakes',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
    count: '80+ Products',
    href: '/products?category=brakes',
  },
  {
    id: 'filters',
    name: 'Filters',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
    count: '120+ Products',
    href: '/products?category=filters',
  },
  {
    id: 'tires',
    name: 'Tires',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80',
    count: '60+ Products',
    href: '/products?category=tires',
  },
];

export const FeaturedCategories = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <H2 className="text-center mb-12 animate-fade-in">Shop by Category</H2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={category.href}>
              <Card variant="md" className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="text-center">
                  <H4 className="mb-2 group-hover:text-teal-600 transition-colors">
                    {category.name}
                  </H4>
                  <BodySmall className="text-gray-600 mb-3">{category.count}</BodySmall>
                  <div className="flex items-center justify-center text-teal-600 group-hover:translate-x-1 transition-transform">
                    <span className="text-sm font-medium">Shop Now</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
