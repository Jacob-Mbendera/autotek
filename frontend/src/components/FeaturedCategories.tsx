import { Link } from 'react-router-dom';
import { ArrowRight, Cog, CircleStop, Filter, Zap } from 'lucide-react';
import { Card } from './ui/Card';
import { H2, H4, BodySmall } from './ui/Typography';
import { marketingImageUrl } from '../constants/cloudinaryAssets';

interface Category {
  id: string;
  name: string;
  image: string;
  count: string;
  href: string;
  icon: typeof Cog;
  gradient: string;
}

const categories: Category[] = [
  {
    id: 'engine',
    name: 'Engine Parts',
    image: marketingImageUrl('categoryEngine', 800),
    count: '150+ Products',
    href: '/products?category=Engine%20Parts',
    icon: Cog,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'brakes',
    name: 'Brake Parts',
    image: marketingImageUrl('categoryBrakes', 800),
    count: '80+ Products',
    href: '/products?category=Brake%20Parts',
    icon: CircleStop,
    gradient: 'from-red-500 to-orange-500',
  },
  {
    id: 'filters',
    name: 'Filters',
    image: marketingImageUrl('categoryFilters', 800),
    count: '120+ Products',
    href: '/products?category=filters',
    icon: Filter,
    gradient: 'from-teal-500 to-green-500',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    image: marketingImageUrl('categoryElectrical', 800),
    count: '90+ Products',
    href: '/products?category=electrical',
    icon: Zap,
    gradient: 'from-yellow-500 to-amber-500',
  },
];

export const FeaturedCategories = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <H2 className="text-4xl font-bold mb-4 animate-fade-in">Shop by Category</H2>
          <BodySmall className="text-gray-600 max-w-2xl mx-auto">
            Explore our wide range of automotive parts organized by category
          </BodySmall>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                to={category.href}
                className="group block animate-slide-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card
                  variant="md"
                  className="h-full hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-teal-200 bg-white group-hover:-translate-y-3"
                >
                  <div className="relative h-56 mb-4 overflow-hidden rounded-t-lg">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-${category.gradient.split(' ')[1]}/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300`}
                    ></div>

                    <div className="absolute top-4 left-4">
                      <div
                        className={`h-14 w-14 bg-gradient-to-br ${category.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                      >
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                        <span className="text-xs font-bold text-gray-900">{category.count}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <H4 className="mb-2 group-hover:text-teal-600 transition-colors">{category.name}</H4>
                    <div className="flex items-center text-teal-600 font-semibold text-sm group-hover:gap-2 transition-all">
                      Browse
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
