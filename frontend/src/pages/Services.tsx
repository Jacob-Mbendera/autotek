import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { Wrench, Truck, Calendar, MapPin, DollarSign, CheckCircle } from 'lucide-react';

export const Services = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleBookService = (serviceType: 'towing' | 'car-service') => {
    if (!isAuthenticated) {
      // Redirect to login with return URL to checkout
      navigate(`/login?returnUrl=/checkout?service=${serviceType}`);
    } else {
      // For now, redirect to checkout - later we can create a dedicated booking page
      navigate(`/checkout?service=${serviceType}`);
    }
  };

  const carServices = [
    {
      type: 'oil-change',
      name: 'Oil Change',
      description: 'Professional engine oil change service at your location',
      icon: Wrench,
      estimatedCost: 'MWK 15,000 - 25,000',
    },
    {
      type: 'brake-pads',
      name: 'Brake Pads Replacement',
      description: 'Replace worn brake pads for safe driving',
      icon: Wrench,
      estimatedCost: 'MWK 30,000 - 50,000',
    },
    {
      type: 'spark-plugs',
      name: 'Spark Plugs Replacement',
      description: 'Replace spark plugs for better engine performance',
      icon: Wrench,
      estimatedCost: 'MWK 20,000 - 35,000',
    },
    {
      type: 'air-filter',
      name: 'Air Filter Replacement',
      description: 'Replace air filter for cleaner engine air intake',
      icon: Wrench,
      estimatedCost: 'MWK 10,000 - 20,000',
    },
    {
      type: 'battery',
      name: 'Battery Replacement',
      description: 'Replace car battery with professional installation',
      icon: Wrench,
      estimatedCost: 'MWK 50,000 - 80,000',
    },
    {
      type: 'tire-rotation',
      name: 'Tire Rotation',
      description: 'Rotate tires for even wear and longer lifespan',
      icon: Wrench,
      estimatedCost: 'MWK 10,000 - 15,000',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <H1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</H1>
        <Body className="text-lg text-gray-600 max-w-2xl mx-auto">
          Professional automotive services delivered to your location. Book a service and our
          certified mechanics will come to you.
        </Body>
      </div>

      {/* Towing Service Section */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="h-8 w-8 text-teal-600" />
          <H1 className="text-2xl font-bold text-gray-900">Towing Services</H1>
        </div>
        <Card variant="md" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-teal-600" />
                <Body className="font-semibold text-gray-900">24/7 Emergency Towing</Body>
              </div>
              <Body className="text-gray-600 mb-4">
                Fast and reliable towing service available 24/7. We'll safely transport your vehicle
                to your preferred destination.
              </Body>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <Body className="text-gray-600">Price: Contact for quote based on distance</Body>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  Available 24/7
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  Professional drivers
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  Safe vehicle transport
                </li>
              </ul>
              <Button
                variant="primary"
                size="default"
                onClick={() => handleBookService('towing')}
                className="w-full md:w-auto"
              >
                <Truck className="h-5 w-5 mr-2" />
                Book Towing Service
              </Button>
            </div>
            <div className="bg-gray-100 rounded-lg flex items-center justify-center p-8">
              <Truck className="h-24 w-24 text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Car Services Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="h-8 w-8 text-teal-600" />
          <H1 className="text-2xl font-bold text-gray-900">Car Services</H1>
        </div>
        <Body className="text-gray-600 mb-6">
          Professional car maintenance services performed at your location. Our certified mechanics
          bring the expertise to you.
        </Body>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {carServices.map((service) => {
            const Icon = service.icon;
            return (
              <Card key={service.type} variant="sm" className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Icon className="h-6 w-6 text-teal-600" />
                  </div>
                  <H1 className="text-lg font-semibold text-gray-900">{service.name}</H1>
                </div>
                <Body className="text-gray-600 mb-4 text-sm">{service.description}</Body>
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Body className="text-gray-600">{service.estimatedCost}</Body>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleBookService('car-service')}
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Service
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-16 bg-teal-50 rounded-lg p-8">
        <H1 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</H1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <H1 className="text-lg font-semibold mb-2">Book a Service</H1>
            <Body className="text-gray-600 text-sm">
              Choose your service and provide your vehicle and location details
            </Body>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <H1 className="text-lg font-semibold mb-2">We Come to You</H1>
            <Body className="text-gray-600 text-sm">
              Our certified mechanic arrives at your location at the scheduled time
            </Body>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <H1 className="text-lg font-semibold mb-2">Service Complete</H1>
            <Body className="text-gray-600 text-sm">
              Your vehicle is serviced professionally, and you pay securely
            </Body>
          </div>
        </div>
      </div>
    </div>
  );
};
