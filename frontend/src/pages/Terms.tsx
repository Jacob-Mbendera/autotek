import { PageHeading, JournalBody, MonoLabel, SectionHeading } from '../components/journal';

const sections = [
  {
    title: 'Using AutoTek',
    body: 'AutoTek is a marketplace for automotive spare parts and mobile car/towing services in Malawi. By using the site, you agree to provide accurate information when placing orders, requesting custom parts, or booking a service, and to use the platform only for lawful purposes.',
  },
  {
    title: 'Orders and payments',
    body: 'Prices are shown in Malawian Kwacha (MWK). Payments are processed securely through PayChangu; AutoTek does not store your card or mobile money PIN. Orders are confirmed once payment is verified.',
  },
  {
    title: 'Car and towing services',
    body: 'Service requests are reviewed and quoted before any payment is taken. A mechanic or driver is assigned once payment is confirmed. Cancellation and refund handling for services is described at the point of booking.',
  },
  {
    title: 'Returns',
    body: 'Eligible orders can be returned in line with the process described on the Returns page. Refunds are processed once a return is received and approved.',
  },
  {
    title: 'Changes to these terms',
    body: 'These terms may be updated from time to time. Continued use of AutoTek after a change constitutes acceptance of the updated terms.',
  },
];

export const Terms = () => (
  <div className="max-w-[820px] mx-auto px-4 sm:px-10 py-16">
    <MonoLabel>Legal</MonoLabel>
    <PageHeading className="mt-3 mb-8">Terms of Service</PageHeading>
    <JournalBody className="mb-10">
      These terms govern your use of AutoTek's website and services. If you have questions, contact
      us at support@autotek.mw.
    </JournalBody>
    <div className="space-y-10">
      {sections.map((section) => (
        <div key={section.title} className="border-t border-journal-hairline pt-6">
          <SectionHeading className="!text-[24px] mb-3">{section.title}</SectionHeading>
          <JournalBody>{section.body}</JournalBody>
        </div>
      ))}
    </div>
  </div>
);
