import { Star } from 'lucide-react';
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
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <H2 className="text-center mb-12 animate-fade-in">What Our Customers Say</H2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} variant="md" className="hover:shadow-lg transition-shadow">
              <div className="flex flex-col h-full">
                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                {/* Comment */}
                <Body className="text-gray-700 mb-4 flex-grow">
                  "{testimonial.comment}"
                </Body>
                {/* Author */}
                <div className="border-t border-gray-200 pt-4">
                  <H4 className="text-sm font-semibold text-gray-900">{testimonial.name}</H4>
                  <BodySmall className="text-gray-500">{testimonial.location}</BodySmall>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
