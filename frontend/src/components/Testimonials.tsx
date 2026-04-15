import { Star, Quote, ShoppingBag, Wrench, CheckCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { H2, H4, Body, BodySmall } from './ui/Typography';
import { testimonials } from '../data/testimonials';

export const Testimonials = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <H2 className="text-4xl font-bold mb-4 animate-fade-in">What Our Customers Say</H2>
          <Body className="text-gray-600 max-w-2xl mx-auto text-lg">
            Trusted by thousands of car owners across Malawi
          </Body>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={testimonial.id} 
              variant="md" 
              className="group hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-3 relative overflow-hidden"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Quote icon background */}
              <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <Quote className="h-24 w-24 text-teal-600" />
              </div>
              
              <div className="flex flex-col h-full p-6 relative z-10">
                {/* Enhanced Rating */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-yellow-400 group-hover:scale-110 transition-transform duration-300"
                      style={{ transitionDelay: `${i * 50}ms` }}
                    />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-gray-700">{testimonial.rating}.0</span>
                </div>
                
                {/* Comment with quote styling */}
                <div className="relative mb-6 flex-grow">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-teal-200 group-hover:text-teal-300 transition-colors" />
                  <Body className="text-gray-700 leading-relaxed pl-6 text-base italic">
                    {testimonial.text}
                  </Body>
                </div>

                {/* Product/Service Details */}
                {(testimonial.productPurchased || testimonial.serviceType) && (
                  <div className="mb-4 flex items-start gap-2 bg-teal-50/50 border border-teal-100 rounded-lg p-3">
                    {testimonial.productPurchased ? (
                      <ShoppingBag className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Wrench className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <BodySmall className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                        {testimonial.productPurchased ? 'Product' : 'Service'}
                      </BodySmall>
                      <BodySmall className="text-gray-700 font-medium text-sm truncate">
                        {testimonial.productPurchased || testimonial.serviceType}
                      </BodySmall>
                      {testimonial.vehicleType && (
                        <BodySmall className="text-gray-500 text-xs mt-0.5">
                          {testimonial.vehicleType}
                        </BodySmall>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Author with enhanced design */}
                <div className="border-t-2 border-gray-100 pt-4 mt-auto">
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className="h-12 w-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <H4 className="text-base font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                        {testimonial.name}
                      </H4>
                      <BodySmall className="text-gray-500 flex items-center gap-1">
                        <span>{testimonial.location}</span>
                        {testimonial.verifiedPurchase && (
                          <>
                            <span className="text-teal-500">•</span>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">Verified Purchase</span>
                          </>
                        )}
                      </BodySmall>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/0 to-teal-50/0 group-hover:from-teal-50/30 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
