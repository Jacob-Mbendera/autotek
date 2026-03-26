import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/database';
import DeliveryLocation from '../models/DeliveryLocation';

// All 28 Districts in Malawi with common landmarks
const malawiLocations = [
  // NORTHERN REGION (6 districts)
  {
    town: 'Chitipa',
    landmarks: [
      'Chitipa Boma',
      'Chitipa Market',
      'Chitipa District Hospital',
      'Chitipa Bus Station',
      'Other/Custom',
    ],
  },
  {
    town: 'Karonga',
    landmarks: [
      'Karonga Boma',
      'Karonga Market',
      'Lake Malawi Shore',
      'Karonga District Hospital',
      'Karonga Bus Station',
      'Other/Custom',
    ],
  },
  {
    town: 'Likoma',
    landmarks: [
      'Likoma Island Boma',
      'Likoma Market',
      'St. Peters Cathedral',
      'Likoma Hospital',
      'Other/Custom',
    ],
  },
  {
    town: 'Mzimba',
    landmarks: [
      'Mzimba Boma',
      'Mzimba Market',
      'Mzuzu University Area',
      'Mzimba District Hospital',
      'Ekwendeni Mission',
      'Other/Custom',
    ],
  },
  {
    town: 'Nkhata Bay',
    landmarks: [
      'Nkhata Bay Boma',
      'Nkhata Bay Market',
      'Lake Malawi Shore',
      'Nkhata Bay District Hospital',
      'Butterfly Space',
      'Chintheche',
      'Other/Custom',
    ],
  },
  {
    town: 'Rumphi',
    landmarks: [
      'Rumphi Boma',
      'Rumphi Market',
      'Rumphi District Hospital',
      'Livingstonia Mission',
      'Nyika National Park Gate',
      'Other/Custom',
    ],
  },

  // CENTRAL REGION (9 districts)
  {
    town: 'Dedza',
    landmarks: [
      'Dedza Boma',
      'Dedza Market',
      'Dedza Pottery',
      'Dedza District Hospital',
      'Dedza Forest Reserve',
      'Other/Custom',
    ],
  },
  {
    town: 'Dowa',
    landmarks: [
      'Dowa Boma',
      'Dowa Market',
      'Dowa District Hospital',
      'Dzalanyama Forest',
      'Mponela Trading Centre',
      'Other/Custom',
    ],
  },
  {
    town: 'Kasungu',
    landmarks: [
      'Kasungu Boma',
      'Kasungu Market',
      'Kasungu National Park Gate',
      'Kasungu District Hospital',
      'Kasungu Teachers College',
      'Other/Custom',
    ],
  },
  {
    town: 'Lilongwe',
    landmarks: [
      'Shoprite Mall',
      'Capital Hill Area',
      'Area 47 Shopping Centre',
      'Area 18',
      'Kanengo Industrial Area',
      'Lilongwe City Centre',
      'Crossroads Hotel',
      'Bingu National Stadium',
      'Kamuzu Central Hospital',
      'Lilongwe Bus Depot',
      'Old Town',
      'Other/Custom',
    ],
  },
  {
    town: 'Mchinji',
    landmarks: [
      'Mchinji Boma',
      'Mchinji Market',
      'Mchinji Border',
      'Mchinji District Hospital',
      'Mchinji Bus Station',
      'Other/Custom',
    ],
  },
  {
    town: 'Nkhotakota',
    landmarks: [
      'Nkhotakota Boma',
      'Nkhotakota Market',
      'Nkhotakota Wildlife Reserve',
      'Nkhotakota District Hospital',
      'Lake Malawi Shore',
      'Other/Custom',
    ],
  },
  {
    town: 'Ntchisi',
    landmarks: [
      'Ntchisi Boma',
      'Ntchisi Market',
      'Ntchisi District Hospital',
      'Ntchisi Forest Reserve',
      'Other/Custom',
    ],
  },
  {
    town: 'Ntcheu',
    landmarks: [
      'Ntcheu Boma',
      'Ntcheu Market',
      'Ntcheu District Hospital',
      'Tsangano Turn-off',
      'Ntcheu Bus Station',
      'Other/Custom',
    ],
  },
  {
    town: 'Salima',
    landmarks: [
      'Salima Boma',
      'Salima Market',
      'Senga Bay',
      'Salima District Hospital',
      'Lake Malawi Shore',
      'Other/Custom',
    ],
  },

  // SOUTHERN REGION (13 districts)
  {
    town: 'Balaka',
    landmarks: [
      'Balaka Boma',
      'Balaka Market',
      'Balaka District Hospital',
      'Balaka Bus Station',
      'Ulongwe',
      'Other/Custom',
    ],
  },
  {
    town: 'Blantyre',
    landmarks: [
      'Chichiri Shopping Mall',
      'Mandala House',
      'Victoria Avenue',
      'Chipembere Highway',
      'Blantyre City Centre',
      'Limbe Market',
      'Soche Market',
      'Game Stores',
      'Queen Elizabeth Central Hospital',
      'Blantyre Sports Club',
      'Limbe Bus Depot',
      'Other/Custom',
    ],
  },
  {
    town: 'Chikwawa',
    landmarks: [
      'Chikwawa Boma',
      'Chikwawa Market',
      'Chikwawa District Hospital',
      'Nchalo Sugar Estate',
      'Lengwe National Park',
      'Other/Custom',
    ],
  },
  {
    town: 'Chiradzulu',
    landmarks: [
      'Chiradzulu Boma',
      'Chiradzulu Market',
      'Chiradzulu District Hospital',
      'Chiradzulu Mountain',
      'Other/Custom',
    ],
  },
  {
    town: 'Machinga',
    landmarks: [
      'Liwonde Boma',
      'Liwonde Market',
      'Machinga District Hospital',
      'Liwonde National Park Gate',
      'Liwonde Barrage',
      'Other/Custom',
    ],
  },
  {
    town: 'Mangochi',
    landmarks: [
      'Mangochi Boma',
      'Mangochi Market',
      'Lake Malawi Shore',
      'Mangochi District Hospital',
      'Club Makokola',
      'Monkey Bay',
      'Other/Custom',
    ],
  },
  {
    town: 'Mulanje',
    landmarks: [
      'Mulanje Boma',
      'Mulanje Market',
      'Mulanje District Hospital',
      'Mount Mulanje',
      'SUCOMA',
      'Other/Custom',
    ],
  },
  {
    town: 'Mwanza',
    landmarks: [
      'Mwanza Boma',
      'Mwanza Market',
      'Mwanza District Hospital',
      'Mwanza Border',
      'Other/Custom',
    ],
  },
  {
    town: 'Nsanje',
    landmarks: [
      'Nsanje Boma',
      'Nsanje Market',
      'Nsanje District Hospital',
      'Nsanje Port',
      'Bangula',
      'Other/Custom',
    ],
  },
  {
    town: 'Thyolo',
    landmarks: [
      'Thyolo Boma',
      'Thyolo Market',
      'Thyolo District Hospital',
      'Tea Estates Area',
      'Thyolo Mountain',
      'Other/Custom',
    ],
  },
  {
    town: 'Phalombe',
    landmarks: [
      'Phalombe Boma',
      'Phalombe Market',
      'Phalombe District Hospital',
      'Migowi',
      'Other/Custom',
    ],
  },
  {
    town: 'Zomba',
    landmarks: [
      'Zomba Town Centre',
      'Chancellor College',
      'Zomba Central Hospital',
      'Zomba Plateau',
      'Zomba Market',
      'Mulunguzi Dam',
      'Zomba Catholic Cathedral',
      'Other/Custom',
    ],
  },
  {
    town: 'Neno',
    landmarks: [
      'Neno Boma',
      'Neno Market',
      'Neno District Hospital',
      'Ligwangwa',
      'Other/Custom',
    ],
  },

  // CITIES (Mzuzu City)
  {
    town: 'Mzuzu',
    landmarks: [
      'Mzuzu City Centre',
      'Katoto Market',
      'Mzuzu Central Hospital',
      'Chibavi Market',
      'Mzuzu Stadium',
      'Shoprite Mzuzu',
      'Orton Chirwa Avenue',
      'Mzuzu Bus Depot',
      'Mzuzu University',
      'Other/Custom',
    ],
  },
];

const seedDeliveryLocations = async () => {
  try {
    console.log('Starting Malawi Delivery Locations Seeding (28 Districts)...\n');

    // Connect to database
    await connectDB();
    console.log('Connected to database\n');

    // Clear existing delivery locations
    const deleteResult = await DeliveryLocation.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing delivery locations\n`);

    // Create new delivery locations
    const createdLocations = [];

    for (const location of malawiLocations) {
      const landmarks = location.landmarks.map((name) => ({
        _id: new mongoose.Types.ObjectId(),
        name,
        active: true,
      }));

      const deliveryLocation = new DeliveryLocation({
        town: location.town,
        landmarks,
        active: true,
      });

      await deliveryLocation.save();
      createdLocations.push(deliveryLocation);

      console.log(`Created ${location.town} with ${location.landmarks.length} landmarks`);
    }

    console.log(`\nSuccessfully seeded ${createdLocations.length} districts!`);
    console.log('\nDistricts seeded:');
    createdLocations.forEach((loc) => {
      console.log(`   - ${loc.town} (${loc.landmarks.length} landmarks)`);
    });

    console.log('\nSeeding complete.\n');

    // Disconnect from database
    await mongoose.connection.close();
    console.log('Disconnected from database');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding delivery locations:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDeliveryLocations();
