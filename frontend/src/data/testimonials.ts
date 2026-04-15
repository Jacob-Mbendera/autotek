export interface Testimonial {
  id: number;
  name: string;
  location: string;
  rating: number;
  date: string;
  text: string;
  productPurchased?: string;
  serviceType?: string;
  vehicleType?: string;
  verifiedPurchase: boolean;
  avatar?: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'John Banda',
    location: 'Lilongwe',
    rating: 5,
    date: '2026-03-15',
    text: 'Needed Bosch brake pads for my Toyota Hilux urgently. Found them in stock and delivered to Lilongwe within 24 hours! The mechanic confirmed they were genuine parts. Very impressed with the speed and authenticity.',
    productPurchased: 'Bosch Brake Pads - Front Set',
    vehicleType: 'Toyota Hilux 2018',
    verifiedPurchase: true,
  },
  {
    id: 2,
    name: 'Mary Phiri',
    location: 'Blantyre',
    rating: 5,
    date: '2026-03-10',
    text: 'The custom order service is amazing! They found a rare alternator for my 2015 Honda Fit that I couldn\'t find anywhere else in Malawi. Communication was excellent and they kept me updated throughout. Highly recommend!',
    productPurchased: 'Honda Alternator 104210-3770',
    vehicleType: 'Honda Fit 2015',
    verifiedPurchase: true,
  },
  {
    id: 3,
    name: 'Peter Mwale',
    location: 'Mzuzu',
    rating: 5,
    date: '2026-03-05',
    text: 'Booked home oil change service for my Mercedes. The mechanic arrived on time at my office in Mzuzu, was professional, and completed the job in 45 minutes. Used Mobil 1 synthetic oil. Very convenient and saved me a trip to the garage!',
    serviceType: 'Oil Change Service',
    vehicleType: 'Mercedes-Benz C-Class 2019',
    verifiedPurchase: true,
  },
  {
    id: 4,
    name: 'Grace Kamwendo',
    location: 'Zomba',
    rating: 5,
    date: '2026-02-28',
    text: 'Excellent experience! Ordered spark plugs and air filter for my Nissan X-Trail. Parts arrived in Zomba in 2 days, well packaged. Prices were better than local shops and I could verify they were genuine NGK parts online.',
    productPurchased: 'NGK Spark Plugs Set + Air Filter',
    vehicleType: 'Nissan X-Trail 2017',
    verifiedPurchase: true,
  },
  {
    id: 5,
    name: 'Chisomo Lungu',
    location: 'Blantyre',
    rating: 5,
    date: '2026-02-20',
    text: 'Needed emergency towing service when my car broke down on the M1 highway near Blantyre. AutoTek sent a tow truck within 40 minutes! Driver was professional and my car was safely transported to my mechanic. Lifesaver!',
    serviceType: 'Emergency Towing',
    vehicleType: 'Mazda Demio 2014',
    verifiedPurchase: true,
  },
  {
    id: 6,
    name: 'Thoko Mbewe',
    location: 'Lilongwe',
    rating: 5,
    date: '2026-02-15',
    text: 'Great service for getting my brake pads replaced at home. The mechanic brought all tools and the job was done professionally. Tested the brakes afterward and they work perfectly. Much better than wasting time at a garage!',
    serviceType: 'Brake Pad Replacement',
    vehicleType: 'Honda CR-V 2016',
    verifiedPurchase: true,
  },
  {
    id: 7,
    name: 'James Nyirenda',
    location: 'Mzuzu',
    rating: 5,
    date: '2026-02-08',
    text: 'Ordered fuel filter and engine oil for my Land Cruiser. Parts were genuine Toyota parts, not cheap knockoffs. Delivery to Mzuzu took 3 days which is reasonable. Will definitely order again when I need parts.',
    productPurchased: 'Toyota Fuel Filter + Castrol Engine Oil',
    vehicleType: 'Toyota Land Cruiser Prado 2015',
    verifiedPurchase: true,
  },
  {
    id: 8,
    name: 'Esther Phiri',
    location: 'Blantyre',
    rating: 5,
    date: '2026-01-30',
    text: 'The battery replacement service was fantastic! They came to my house, tested my old battery, installed a new Bosch battery, and disposed of the old one properly. Very professional and convenient service.',
    serviceType: 'Battery Replacement',
    vehicleType: 'Toyota Vitz 2013',
    verifiedPurchase: true,
  },
];
