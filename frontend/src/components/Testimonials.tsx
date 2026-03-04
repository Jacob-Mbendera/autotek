import { Star, Quote } from 'lucide-react';
import { Card } from './ui/Card';
import { H2, H4, Body, BodySmall } from './ui/Typography';

interface Testimonial {
  id: number;
  name: string;
  location: string;
  rating: number;
  comment: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'John Banda',
    location: 'Lilongwe',
    rating: 5,
    comment: 'Found exactly what I needed for my car. Fast delivery and great customer service!',
  },
  {
    id: 2,
    name: 'Mary Phiri',
    location: 'Blantyre',
    rating: 5,
    comment: 'The custom order service is amazing. They found a rare part I couldn\'t find anywhere else.',
  },
  {
    id: 3,
    name: 'Peter Mwale',
    location: 'Mzuzu',
    rating: 5,
    comment: 'Booked a home service and the mechanic was professional and on time. Highly recommend!',
  },
];

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
                    {testimonial.comment}
                  </Body>
                </div>
                
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
                        <span className="text-teal-500">•</span>
                        <span>Verified Customer</span>
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
