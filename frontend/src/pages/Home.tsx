import { Link } from 'react-router-dom';
import { Package, Wrench, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { H1, H2, H4, Body } from '../components/ui/Typography';
import { TrustIndicators } from '../components/TrustIndicators';
import { FeaturedCategories } from '../components/FeaturedCategories';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonials } from '../components/Testimonials';

export const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section - Enhanced with background image */}
      <section className="relative bg-gradient-to-br from-teal-50 via-white to-teal-50 overflow-hidden mb-16 animate-fade-in">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')] bg-cover bg-center opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left animate-slide-in-left">
              <H1 className="mb-6 text-5xl lg:text-6xl font-bold">
                Your Trusted Auto Parts{' '}
                <span className="text-teal-600">Partner</span>
              </H1>
              <Body className="text-xl text-gray-700 mb-8 max-w-xl mx-auto lg:mx-0">
                Your one-stop shop for automotive spare parts and services in Malawi.
                Find quality parts, request custom orders, and book car services all in one place.
              </Body>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/products">
                  <Button size="large" className="group transform hover:scale-105 transition-transform">
                    Browse Products
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/services">
                  <Button variant="secondary" size="large" className="transform hover:scale-105 transition-transform">
                    Book a Service
                  </Button>
                </Link>
              </div>
            </div>
            {/* Right side - Image */}
            <div className="hidden lg:block animate-slide-in-right">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <img
                  src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80"
                  alt="Automotive parts and services"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-600/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <TrustIndicators />

      {/* Featured Categories */}
      <FeaturedCategories />

      {/* How It Works */}
      <HowItWorks />

      {/* Enhanced Features Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <H2 className="text-center mb-12 animate-fade-in">What We Offer</H2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="lg" className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="relative h-48 mb-6 overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80"
                  alt="Spare Parts"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-600/40 to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <div className="h-16 w-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Package className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <H4 className="mb-3">Spare Parts</H4>
                <Body className="text-gray-600">
                  Browse our extensive catalog of automotive spare parts. Can't find what you need?
                  Request a custom order!
                </Body>
              </div>
            </Card>

            <Card variant="lg" className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="relative h-48 mb-6 overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80"
                  alt="Car Services"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-600/40 to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <div className="h-16 w-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Wrench className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <H4 className="mb-3">Car Services</H4>
                <Body className="text-gray-600">
                  Book home car services including oil changes, brake pad replacement, and more.
                  Convenient and reliable.
                </Body>
              </div>
            </Card>

            <Card variant="lg" className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="relative h-48 mb-6 overflow-hidden rounded-lg">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"
                  alt="Easy Shopping"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-600/40 to-transparent"></div>
                <div className="absolute top-4 right-4">
                  <div className="h-16 w-16 bg-white/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <ShoppingCart className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <H4 className="mb-3">Easy Shopping</H4>
                <Body className="text-gray-600">
                  Simple checkout process with Airtel Money and bank transfer options.
                  Track your orders in real-time.
                </Body>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />
    </div>
  );
};
