import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Wrench, ShoppingCart, ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { H1, H2, H4, Body } from '../components/ui/Typography';
import { TrustIndicators } from '../components/TrustIndicators';
import { FeaturedCategories } from '../components/FeaturedCategories';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonials } from '../components/Testimonials';

export const Home = () => {
  useEffect(() => {
    // Add page transition class on mount
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  return (
    <div className="w-full page-transition">
      {/* Hero Section - Enhanced with animated backgrounds and improved design */}
      <section className="relative bg-gradient-to-br from-teal-50 via-white to-teal-50 overflow-hidden mb-16 animate-fade-in min-h-[90vh] flex items-center">
        {/* Enhanced decorative background pattern */}
        <div className="absolute inset-0 geometric-pattern opacity-20"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')] bg-cover bg-center opacity-15"></div>
        
        {/* Animated blob backgrounds */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000 transform -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Floating particles/elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-teal-400 rounded-full opacity-60 animate-float"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-teal-500 rounded-full opacity-50 animate-float animation-delay-2000"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-teal-300 rounded-full opacity-70 animate-float animation-delay-4000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left animate-slide-in-left space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-4 animate-scale-in">
                <Sparkles className="h-4 w-4" />
                <span>Malawi's #1 Auto Parts Marketplace</span>
              </div>
              
              <H1 className="mb-6 text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Your Trusted Auto Parts{' '}
                <span className="text-teal-600 relative">
                  Partner
                  <span className="absolute -bottom-2 left-0 right-0 h-3 bg-teal-200/50 -z-10 transform -skew-x-12"></span>
                </span>
              </H1>
              
              <Body className="text-xl lg:text-2xl text-gray-700 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Your one-stop shop for automotive spare parts and services in Malawi.
                Find quality parts, request custom orders, and book car services all in one place.
              </Body>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/products">
                  <Button 
                    size="large" 
                    className="group relative overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <span className="relative z-10 flex items-center">
                      Browse Products
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  </Button>
                </Link>
                <Link to="/services">
                  <Button 
                    variant="secondary" 
                    size="large" 
                    className="group transform hover:scale-105 transition-all duration-300 border-2 hover:border-teal-500 hover:bg-teal-50"
                  >
                    Book a Service
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <div className="flex items-center gap-6 justify-center lg:justify-start pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
                  <span>100% Authentic Parts</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
                  <span>Fast Delivery</span>
                </div>
              </div>
            </div>
            
            {/* Right side - Image with enhanced effects */}
            <div className="hidden lg:block animate-slide-in-right">
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-teal-400 to-teal-600 rounded-3xl opacity-20 group-hover:opacity-30 blur-2xl transition-opacity duration-300"></div>
                
                <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-all duration-500 border-4 border-white">
                  <img
                    src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80"
                    alt="Automotive parts and services"
                    className="w-full h-[550px] object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-600/10 to-transparent"></div>
                  
                  {/* Floating badge on image */}
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg animate-float">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-900">500+ Parts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block animate-bounce-slow">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <span className="text-xs font-medium">Scroll to explore</span>
              <ChevronDown className="h-6 w-6" />
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
      <section className="py-20 bg-gradient-to-b from-gray-50 via-white to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <H2 className="text-4xl font-bold mb-4 animate-fade-in">What We Offer</H2>
            <Body className="text-gray-600 max-w-2xl mx-auto text-lg">
              Everything you need for your vehicle in one convenient platform
            </Body>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card 
              variant="lg" 
              className="group hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-4 relative"
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/0 group-hover:from-teal-50/50 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
              
              <div className="relative h-56 mb-6 overflow-hidden rounded-t-lg">
                <img
                  src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80"
                  alt="Spare Parts"
                  className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/60 via-teal-600/20 to-transparent group-hover:from-teal-900/70 transition-opacity duration-500"></div>
                
                {/* Enhanced icon badge */}
                <div className="absolute top-6 right-6">
                  <div className="h-20 w-20 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border-2 border-teal-100">
                    <Package className="h-10 w-10 text-teal-600 group-hover:text-teal-700 transition-colors" />
                  </div>
                </div>
                
                {/* Decorative corner accent */}
                <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-br-full"></div>
              </div>
              
              <div className="text-center p-6 relative z-10">
                <H4 className="mb-3 text-xl font-bold group-hover:text-teal-600 transition-colors duration-300">Spare Parts</H4>
                <Body className="text-gray-600 leading-relaxed">
                  Browse our extensive catalog of automotive spare parts. Can't find what you need?
                  Request a custom order!
                </Body>
              </div>
            </Card>

            <Card 
              variant="lg" 
              className="group hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-4 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/0 group-hover:from-teal-50/50 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
              
              <div className="relative h-56 mb-6 overflow-hidden rounded-t-lg">
                <img
                  src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80"
                  alt="Car Services"
                  className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/60 via-teal-600/20 to-transparent group-hover:from-teal-900/70 transition-opacity duration-500"></div>
                
                <div className="absolute top-6 right-6">
                  <div className="h-20 w-20 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border-2 border-teal-100">
                    <Wrench className="h-10 w-10 text-teal-600 group-hover:text-teal-700 transition-colors" />
                  </div>
                </div>
                
                <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-br-full"></div>
              </div>
              
              <div className="text-center p-6 relative z-10">
                <H4 className="mb-3 text-xl font-bold group-hover:text-teal-600 transition-colors duration-300">Car Services</H4>
                <Body className="text-gray-600 leading-relaxed">
                  Book home car services including oil changes, brake pad replacement, and more.
                  Convenient and reliable.
                </Body>
              </div>
            </Card>

            <Card 
              variant="lg" 
              className="group hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-4 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/0 group-hover:from-teal-50/50 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
              
              <div className="relative h-56 mb-6 overflow-hidden rounded-t-lg">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"
                  alt="Easy Shopping"
                  className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/60 via-teal-600/20 to-transparent group-hover:from-teal-900/70 transition-opacity duration-500"></div>
                
                <div className="absolute top-6 right-6">
                  <div className="h-20 w-20 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 border-2 border-teal-100">
                    <ShoppingCart className="h-10 w-10 text-teal-600 group-hover:text-teal-700 transition-colors" />
                  </div>
                </div>
                
                <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-teal-500/20 to-transparent rounded-br-full"></div>
              </div>
              
              <div className="text-center p-6 relative z-10">
                <H4 className="mb-3 text-xl font-bold group-hover:text-teal-600 transition-colors duration-300">Easy Shopping</H4>
                <Body className="text-gray-600 leading-relaxed">
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
