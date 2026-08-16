import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import {
  HeroHeading,
  SectionHeading,
  CardHeading,
  JournalBody,
  MonoLabel,
  Eyebrow,
  JournalCard,
  JournalButtonGroup,
  JournalButton,
} from '../components/journal';
import { Zap, Settings, Battery, Droplet, Gauge, Car } from 'lucide-react';
import { marketingImageUrl } from '../constants/cloudinaryAssets';

const SERVICES_HERO_BG = marketingImageUrl('servicesAtHome', 1920);
const SERVICES_TOWING_BG = marketingImageUrl('servicesTowing', 800);

const SUPPORT_EMAIL = 'support@autotek.mw';
const SUPPORT_PHONE = '+265 887 111 444';
const SUPPORT_PHONE_HREF = 'tel:+265887111444';

// Numbered catalogue, matching the editorial index pattern used on Home's
// "Shop by system" — same 6 service types the booking form accepts.
const serviceCatalog: Array<{ no: string; type: string; name: string; desc: string }> = [
  { no: '01', type: 'oil-change', name: 'Oil Change', desc: 'Engine oil & filter replacement.' },
  { no: '02', type: 'brake-pads', name: 'Brake Pads', desc: 'Inspection & pad replacement.' },
  { no: '03', type: 'spark-plugs', name: 'Spark Plugs', desc: 'Replacement & ignition check.' },
  { no: '04', type: 'air-filter', name: 'Air Filter', desc: 'Clean airflow, better economy.' },
  { no: '05', type: 'battery', name: 'Battery', desc: 'Testing & replacement on-site.' },
  { no: '06', type: 'tire-rotation', name: 'Tire Rotation', desc: 'Even wear, longer tire life.' },
];

const iconForType: Record<string, typeof Droplet> = {
  'oil-change': Droplet,
  'brake-pads': Settings,
  'spark-plugs': Zap,
  'air-filter': Gauge,
  battery: Battery,
  'tire-rotation': Car,
};

const benefits = [
  { title: '24/7 availability', desc: 'Round-the-clock response.' },
  { title: 'Certified mechanics', desc: 'Vetted professionals.' },
  { title: 'Quality guaranteed', desc: 'Genuine parts, honest work.' },
  { title: 'At your location', desc: 'Home, office or roadside.' },
];

export const Services = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleBookService = (serviceType: 'towing' | 'car-service', serviceId?: string) => {
    const target = `/book-service?service=${serviceType}${serviceId ? `&id=${serviceId}` : ''}`;
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=${target}`);
    } else {
      navigate(target);
    }
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <section
        className="relative min-h-[380px] sm:min-h-[440px] flex items-end bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(15,40,36,0.92), rgba(15,40,36,0.4)), url('${SERVICES_HERO_BG}')`,
        }}
      >
        <div className="px-4 sm:px-10 py-12 sm:py-14 max-w-[640px] text-journal-bone">
          <MonoLabel className="!text-journal-teal-bright mb-4 block">
            No. 02 — Professional mobile services
          </MonoLabel>
          <HeroHeading className="!text-journal-bone !text-[36px] sm:!text-[46px] lg:!text-[54px] mb-6">
            Auto services delivered to you.
          </HeroHeading>
          <JournalButtonGroup className="border-journal-bone/50">
            <JournalButton
              variant="primary"
              className="!bg-journal-bone !text-journal-teal border-0"
              onClick={() => handleBookService('car-service')}
            >
              Book car service
            </JournalButton>
            <JournalButton
              variant="secondary"
              className="!text-journal-bone border-0"
              onClick={() => handleBookService('towing')}
            >
              Emergency towing
            </JournalButton>
          </JournalButtonGroup>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="max-w-[1280px] mx-auto grid grid-cols-2 lg:grid-cols-4 border-b border-journal-ink">
        {benefits.map((b, i) => (
          <div
            key={b.title}
            className={`px-6 sm:px-8 py-6 ${i % 2 === 0 ? 'border-r' : i === benefits.length - 1 ? '' : 'border-r'} border-journal-hairline ${
              i >= 2 ? 'border-t lg:border-t-0' : ''
            } lg:border-r lg:last:border-r-0`}
          >
            <div className="font-sans font-semibold text-[15px] text-journal-ink mb-1">{b.title}</div>
            <div className="text-[13px] text-journal-muted">{b.desc}</div>
          </div>
        ))}
      </section>

      {/* Sign-in nudge */}
      <section className="max-w-[820px] mx-auto px-4 sm:px-10 py-8 text-center">
        <JournalBody>
          {isAuthenticated ? (
            <>
              Book towing or car maintenance below. Track and manage your requests anytime in{' '}
              <Link to="/my-services" className="text-journal-teal font-semibold hover:underline">
                My Services
              </Link>
              .
            </>
          ) : (
            <>
              Book towing or car maintenance below.{' '}
              <Link to="/login?returnUrl=/my-services" className="text-journal-teal font-semibold hover:underline">
                Sign in
              </Link>{' '}
              to view and manage your bookings.
            </>
          )}
        </JournalBody>
      </section>

      {/* Towing */}
      <section className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 border-t border-journal-ink">
        <div className="px-4 sm:px-10 py-12 sm:py-14 lg:border-r border-journal-ink">
          <Eyebrow>Emergency towing</Eyebrow>
          <SectionHeading className="mt-3 mb-4 !text-[30px] sm:!text-[36px]">
            Stranded? We'll reach you.
          </SectionHeading>
          <JournalBody className="mb-5">
            24/7 towing anywhere in Malawi. Contact for a quote in MWK based on distance.
          </JournalBody>
          <ul className="text-[14px] leading-[2.1] text-journal-ink/90 mb-6">
            <li>&#10003; Rapid dispatch, live driver location</li>
            <li>&#10003; Flatbed &amp; standard recovery</li>
            <li>&#10003; Transparent distance-based pricing</li>
            <li>&#10003; Accident &amp; breakdown recovery</li>
          </ul>
          <JournalButton variant="primary" onClick={() => handleBookService('towing')}>
            Request towing
          </JournalButton>
        </div>
        <div
          className="min-h-[280px] lg:min-h-[360px] bg-cover bg-center"
          style={{ backgroundImage: `url('${SERVICES_TOWING_BG}')` }}
        />
      </section>

      {/* Car services catalogue */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-10 py-14 sm:py-16">
        <Eyebrow>Book a car service</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-journal-ink mt-6">
          {serviceCatalog.map((svc) => {
            const Icon = iconForType[svc.type];
            return (
              <button
                key={svc.no}
                onClick={() => handleBookService('car-service', svc.type)}
                className="text-left border-r border-b border-journal-ink p-6 hover:bg-journal-sand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal focus-visible:ring-inset"
              >
                <div className="flex items-center justify-between mb-4">
                  <MonoLabel>{svc.no}</MonoLabel>
                  <Icon className="h-5 w-5 text-journal-teal" />
                </div>
                <CardHeading className="!text-[22px] mb-1.5">{svc.name}</CardHeading>
                <div className="text-[13px] text-journal-muted mb-4">{svc.desc}</div>
                <span className="text-[12px] font-sans font-semibold tracking-[0.1em] uppercase text-journal-teal">
                  Book service &rarr;
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Partner with AutoTek */}
      <section className="bg-journal-deep-teal text-journal-bone px-4 sm:px-10 py-14">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <MonoLabel className="!text-journal-teal-bright mb-3 block">For mechanics &amp; garages</MonoLabel>
            <SectionHeading className="!text-journal-bone !text-[28px] sm:!text-[34px] mb-3">
              Partner with AutoTek
            </SectionHeading>
            <p className="text-[15px] leading-[1.65] text-journal-footer-1">
              Run a garage, tow truck, or mobile mechanic business? Join our network and reach
              customers across Malawi. Email the details below and our team will review your
              application.
            </p>
          </div>
          <div className="lg:text-right">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Partner%20application`}
              className="inline-block bg-journal-teal-bright text-journal-deep-teal px-6 py-3.5 text-[12px] font-sans font-bold tracking-[0.1em] uppercase hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-journal-deep-teal"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-journal-ink text-journal-bone px-4 sm:px-10 py-16 text-center">
        <SectionHeading className="!text-journal-bone mb-3">Ready to get started?</SectionHeading>
        <JournalBody className="!text-journal-footer-1 max-w-[560px] mx-auto mb-8">
          Book your service today and experience professional auto care delivered to your location.
        </JournalBody>
        <JournalButtonGroup className="mx-auto border-journal-bone/50">
          <JournalButton
            variant="primary"
            className="!bg-journal-bone !text-journal-ink border-0"
            onClick={() => handleBookService('car-service')}
          >
            Book car service
          </JournalButton>
          <JournalButton variant="secondary" className="!text-journal-bone border-0" onClick={() => handleBookService('towing')}>
            Emergency towing
          </JournalButton>
        </JournalButtonGroup>
        <p className="mt-8 text-[12px] tracking-[0.1em] uppercase text-journal-footer-2">
          Or call for emergency towing:{' '}
          <a href={SUPPORT_PHONE_HREF} className="text-journal-teal-bright hover:underline">
            {SUPPORT_PHONE}
          </a>
        </p>
      </section>
    </div>
  );
};
