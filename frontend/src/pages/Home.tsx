import { Link } from 'react-router-dom';
import { useGetProductsQuery, useGetCategoriesQuery } from '../store/api/productApi';
import { HeroHeading, SectionHeading, PullQuote, JournalBody, MonoLabel, Eyebrow } from '../components/journal';
import { JournalButton, JournalLinkButton, JournalButtonGroup } from '../components/journal';
import { marketingImageUrl } from '../constants/cloudinaryAssets';
import { testimonials } from '../data/testimonials';

const HERO_HOME_FEATURE = marketingImageUrl('heroHomeFeature', 1400);
const OFFER_SPARE_PARTS = marketingImageUrl('offerSpareParts', 800);
const OFFER_CAR_SERVICES = marketingImageUrl('offerCarServices', 800);
const OFFER_EASY_SHOPPING = marketingImageUrl('offerEasyShopping', 800);

// Curated subset of the live category list — the real backend has ~11 categories
// with duplicates/seed data (e.g. "Braking System" vs "Brake Parts", a "Test"
// category); this keeps the homepage index clean while still pulling real counts.
const SHOP_BY_SYSTEM = [
  { no: '01', name: 'Engine', desc: 'Belts, pistons, gaskets, cooling', category: 'Engine Parts' },
  { no: '02', name: 'Brakes', desc: 'Pads, discs, calipers, fluid', category: 'Brake Parts' },
  { no: '03', name: 'Filters', desc: 'Oil, air, cabin, fuel', category: 'Filters' },
  { no: '04', name: 'Electrical', desc: 'Batteries, plugs, wiring, sensors', category: 'Electrical' },
];

const OFFERS = [
  {
    no: '01 / SPARE PARTS',
    image: OFFER_SPARE_PARTS,
    title: 'Stocked & custom-sourced',
    body: "Buy from our warehouse or request a part we don't stock — we source and quote it for you.",
  },
  {
    no: '02 / CAR SERVICES',
    image: OFFER_CAR_SERVICES,
    title: 'A mechanic comes to you',
    body: 'Oil changes, brakes, batteries and more — serviced at your home or roadside.',
  },
  {
    no: '03 / SHOPPING',
    image: OFFER_EASY_SHOPPING,
    title: 'Order, pay, delivered',
    body: 'Simple checkout in MWK with mobile money, tracked to your door.',
  },
];

const featuredQuote = testimonials.find((t) => t.id === 7) ?? testimonials[0];

export const Home = () => {
  const { data: productsData } = useGetProductsQuery({ page: 1, limit: 1 });
  const { data: categoriesData } = useGetCategoriesQuery();

  const partsCount = productsData?.pagination.total;
  const categoryCountFor = (name: string) =>
    categoriesData?.categories.find((c) => c.name === name)?.count;

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-4 sm:px-10 py-14 lg:py-16 flex flex-col justify-between gap-10 lg:border-r lg:border-journal-ink">
            <div className="flex items-center justify-between">
              <MonoLabel>No. 01</MonoLabel>
              <MonoLabel>The Marketplace</MonoLabel>
            </div>

            <HeroHeading>
              The right part,
              <br />
              and the <span className="italic font-normal">mechanic</span>
              <br />
              to fit it.
            </HeroHeading>

            <div>
              <JournalBody className="max-w-[420px] mb-7">
                Genuine spare parts, custom sourcing, and mobile car service across Malawi —
                bought and booked in one place, delivered to your door.
              </JournalBody>
              <JournalButtonGroup>
                <JournalLinkButton to="/products" variant="primary" className="border-0">
                  Browse parts
                </JournalLinkButton>
                <JournalLinkButton to="/services" variant="secondary" className="border-0">
                  Book a service
                </JournalLinkButton>
              </JournalButtonGroup>
            </div>
          </div>

          <div className="relative min-h-[320px] lg:min-h-[560px] overflow-hidden">
            <img
              src={HERO_HOME_FEATURE}
              alt="AutoTek mobile mechanic servicing a car"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute left-0 bottom-0 w-full px-5 py-4 bg-gradient-to-t from-journal-ink/85 to-transparent">
              <span className="font-journal-mono text-[11px] tracking-[0.1em] text-journal-bone/90">
                FIG. 01 — MOBILE SERVICE, BLANTYRE
              </span>
            </div>
          </div>
        </div>

        {/* Stat ledger */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-journal-ink">
          <div className="px-6 sm:px-10 py-6 border-r border-journal-hairline">
            <div className="font-journal text-[32px] tabular-nums text-journal-ink">100%</div>
            <MonoLabel className="mt-1 block">Authentic parts</MonoLabel>
          </div>
          <div className="px-6 sm:px-10 py-6 border-r border-journal-hairline">
            <div className="font-journal text-[32px] tabular-nums text-journal-ink">24 / 7</div>
            <MonoLabel className="mt-1 block">Emergency towing</MonoLabel>
          </div>
          <div className="px-6 sm:px-10 py-6 border-r-0 sm:border-r border-journal-hairline border-t sm:border-t-0">
            <div className="font-journal text-[32px] tabular-nums text-journal-ink">
              {partsCount != null ? `${partsCount.toLocaleString()}+` : '—'}
            </div>
            <MonoLabel className="mt-1 block">Parts in catalogue</MonoLabel>
          </div>
          <div className="px-6 sm:px-10 py-6 border-t sm:border-t-0">
            <div className="font-journal text-[32px] tabular-nums text-journal-ink">16</div>
            <MonoLabel className="mt-1 block">Districts served</MonoLabel>
          </div>
        </div>
      </section>

      {/* Shop by system */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-10">
        <div className="pt-14 pb-2 flex items-baseline justify-between">
          <Eyebrow>Shop by system</Eyebrow>
          <MonoLabel>Index / four of {categoriesData?.categories.length ?? '—'}</MonoLabel>
        </div>
        <div className="pb-12">
          {SHOP_BY_SYSTEM.map((item) => {
            const count = categoryCountFor(item.category);
            return (
              <Link
                key={item.no}
                to={`/products?category=${encodeURIComponent(item.category)}`}
                className="grid grid-cols-[44px_1fr_auto_auto] sm:grid-cols-[60px_1.4fr_1fr_auto] items-center gap-4 sm:gap-5 py-5 border-t border-journal-ink first:border-t last:border-b group"
              >
                <span className="font-journal-mono text-[13px] text-journal-faint">{item.no}</span>
                <span className="font-journal text-[22px] sm:text-[30px] text-journal-ink">{item.name}</span>
                <span className="hidden sm:block text-[13px] text-journal-muted">{item.desc}</span>
                <span className="flex items-center gap-3">
                  {count != null && (
                    <span className="hidden md:inline font-journal-mono text-[11px] text-journal-faint">
                      {count} parts
                    </span>
                  )}
                  <span className="text-xl text-journal-teal group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Three ways AutoTek keeps you moving */}
      <section className="bg-journal-ink text-journal-bone px-4 sm:px-10 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <SectionHeading className="!text-journal-bone max-w-[540px]">
              Three ways AutoTek keeps you moving
            </SectionHeading>
            <MonoLabel className="!text-journal-footer-2">No. 02 — Services</MonoLabel>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {OFFERS.map((offer) => (
              <div key={offer.no}>
                <div
                  className="h-[220px] sm:h-[250px] bg-cover bg-center"
                  style={{ backgroundImage: `url('${offer.image}')` }}
                />
                <MonoLabel className="!text-journal-teal-bright mt-5 mb-2.5 block">{offer.no}</MonoLabel>
                <h3 className="font-journal font-normal text-[22px] sm:text-2xl mb-2 text-journal-bone">
                  {offer.title}
                </h3>
                <p className="text-sm leading-[1.65] text-journal-footer-1">{offer.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pull-quote */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-10 py-14">
        <div className="border-t border-b border-journal-ink py-12 text-center">
          <PullQuote className="max-w-[820px] mx-auto">
            &ldquo;{featuredQuote.text}&rdquo;
          </PullQuote>
          <MonoLabel className="mt-6 block">
            {featuredQuote.name} &mdash; {featuredQuote.location}
          </MonoLabel>
        </div>
      </section>
    </div>
  );
};
