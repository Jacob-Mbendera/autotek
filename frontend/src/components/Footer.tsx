import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

const SUPPORT_EMAIL = 'support@autotek.mw';
const SUPPORT_PHONE = '+265 887 111 444';

const shopLinks = [
  { name: 'Parts', href: '/products' },
  { name: 'Categories', href: '/products' },
  { name: 'Track order', href: '/my-services' },
  { name: 'Returns', href: '/returns' },
];

const serviceLinks = [
  { name: 'Book a service', href: '/book-service' },
  { name: 'Emergency towing', href: '/book-service?service=towing' },
  { name: 'My services', href: '/my-services' },
  { name: 'Become a partner', href: '/services' },
];

const columnTitleClasses =
  'text-journal-footer-1 text-[11px] font-sans font-semibold tracking-[0.14em] uppercase mb-3';
const linkClasses =
  'block py-1 text-[13px] font-sans text-journal-footer-2 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal-bright focus-visible:ring-offset-2 focus-visible:ring-offset-journal-ink rounded-sm';
const legalLinkClasses =
  'hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal-bright focus-visible:ring-offset-2 focus-visible:ring-offset-journal-ink rounded-sm';

export const Footer = () => (
  <footer className="bg-journal-ink text-journal-footer-2">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-10 pt-14 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 pb-9 border-b border-journal-footer-3/40">
        <div>
          <Link
            to="/"
            aria-label="AutoTek home"
            className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal-bright focus-visible:ring-offset-2 focus-visible:ring-offset-journal-ink rounded-sm"
          >
            <BrandLogo variant="footer" imgClassName="h-7 sm:h-8 max-w-[160px]" />
          </Link>
          <p className="text-[13px] leading-[1.65] max-w-[260px] mt-4 text-journal-footer-2">
            Auto parts &amp; mobile car services, delivered across Malawi.
          </p>
        </div>

        <div>
          <div className={columnTitleClasses}>Shop</div>
          {shopLinks.map((link) => (
            <Link key={link.name} to={link.href} className={linkClasses}>
              {link.name}
            </Link>
          ))}
        </div>

        <div>
          <div className={columnTitleClasses}>Services</div>
          {serviceLinks.map((link) => (
            <Link key={link.name} to={link.href} className={linkClasses}>
              {link.name}
            </Link>
          ))}
        </div>

        <div>
          <div className={columnTitleClasses}>Contact</div>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClasses}>
            {SUPPORT_EMAIL}
          </a>
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className={linkClasses}>
            {SUPPORT_PHONE}
          </a>
          <p className="py-1 text-[13px] text-journal-footer-2">Blantyre &middot; Lilongwe</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[11px] tracking-[0.1em] uppercase text-journal-footer-3">
        <span>&copy; {new Date().getFullYear()} AutoTek Malawi</span>
        <div className="flex items-center gap-4">
          <Link to="/terms" className={legalLinkClasses}>
            Terms
          </Link>
          <Link to="/privacy" className={legalLinkClasses}>
            Privacy
          </Link>
          <Link to="/returns" className={legalLinkClasses}>
            Returns
          </Link>
        </div>
      </div>
    </div>
  </footer>
);
