import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Header } from './Header';
import { BrandLogo } from './BrandLogo';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center gap-4 text-center text-gray-600">
            <Link to="/" className="inline-flex" aria-label="AutoTek home">
              <BrandLogo variant="footer" imgClassName="h-7 sm:h-8 max-w-[160px]" />
            </Link>
            <p className="text-sm">
              © {new Date().getFullYear()} AutoTek. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
