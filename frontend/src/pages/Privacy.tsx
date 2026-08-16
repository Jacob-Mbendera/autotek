import { PageHeading, JournalBody, MonoLabel, SectionHeading } from '../components/journal';

const sections = [
  {
    title: 'Information we collect',
    body: 'When you create an account, place an order, or book a service, we collect information such as your name, email, phone number, delivery address, and vehicle details you provide for a service request.',
  },
  {
    title: 'How we use your information',
    body: 'We use this information to process orders and service bookings, communicate about their status, verify payments, and improve the platform. We do not sell your personal information.',
  },
  {
    title: 'Payments',
    body: 'Payments are handled by PayChangu. AutoTek never sees or stores your card number or mobile money PIN.',
  },
  {
    title: 'Sharing with service providers',
    body: 'When you book a car service or towing, relevant details (name, phone, location) are shared with the assigned mechanic or driver so they can carry out the job.',
  },
  {
    title: 'Your choices',
    body: 'You can review and update your account details from your Profile page at any time. To request deletion of your data, contact support@autotek.mw.',
  },
];

export const Privacy = () => (
  <div className="max-w-[820px] mx-auto px-4 sm:px-10 py-16">
    <MonoLabel>Legal</MonoLabel>
    <PageHeading className="mt-3 mb-8">Privacy Policy</PageHeading>
    <JournalBody className="mb-10">
      This policy explains what information AutoTek collects and how it's used. If you have
      questions, contact us at support@autotek.mw.
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
