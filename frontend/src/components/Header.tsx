import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, LogOut, Wrench, Truck, Settings, Heart } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/types';
import { logout } from '../store/slices/authSlice';
import { useGetWishlistQuery } from '../store/api/wishlistApi';
import { useLogoutMutation } from '../store/api/authApi';
import { broadcastClientSync } from '../utils/crossTabSync';
import { UserRole } from '@shared/types';
import { BrandLogo } from './BrandLogo';
import { cn } from '../utils/cn';

const SUPPORT_PHONE = '+265 887 111 444';
const SUPPORT_PHONE_HREF = 'tel:+265887111444';

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'Orders', href: '/orders' },
  { name: 'Returns', href: '/returns' },
  { name: 'Services', href: '/services' },
  { name: 'My Services', href: '/my-services' },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevWishlistCount, setPrevWishlistCount] = useState(0);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart);
  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const wishlistCount = wishlistData?.wishlist?.products?.length || 0;

  // Track when count changes for animation
  const [isCountAnimating, setIsCountAnimating] = useState(false);

  // Trigger animation when count changes
  if (wishlistCount !== prevWishlistCount) {
    setPrevWishlistCount(wishlistCount);
    setIsCountAnimating(true);
    setTimeout(() => setIsCountAnimating(false), 300);
  }

  const [logoutRequest] = useLogoutMutation();

  const handleLogout = async () => {
    // Await the server call before resetting client state — dispatching
    // logout() triggers rtkQueryCacheResetMiddleware's resetApiState(),
    // which aborts every in-flight RTK Query request, including this
    // mutation itself if fired concurrently with it.
    try {
      await logoutRequest().unwrap();
    } catch {
      // Proceed with client-side logout regardless (e.g. offline) — the
      // cookie may still be set server-side, but there's nothing more the
      // client can do about that here, and the user still expects to end
      // up logged out locally.
    }
    dispatch(logout());
    broadcastClientSync('auth');
    navigate('/login');
    setMobileMenuOpen(false);
  };

  // "Track an order" has no standalone lookup feature — route to what
  // already exists: My Services for a signed-in user, login otherwise.
  const trackOrderHref = isAuthenticated ? '/my-services' : '/login?returnUrl=/my-services';

  const navLinkClasses =
    'text-[12px] font-sans font-medium tracking-[0.12em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors';

  return (
    <header className="sticky top-0 z-50 bg-journal-bone">
      {/* Utility bar */}
      <div className="bg-journal-ink text-journal-footer-1">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4 px-4 sm:px-10 py-2.5 text-[11px] font-sans tracking-[0.13em] uppercase overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-6">
            <span>Malawi &middot; MWK</span>
            <span className="hidden sm:inline text-journal-footer-2">Nationwide delivery &amp; 24/7 towing</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to={trackOrderHref} className="hover:text-white transition-colors">
              Track an order
            </Link>
            <a href={SUPPORT_PHONE_HREF} className="hover:text-white transition-colors">
              Support &middot; {SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-journal-ink">
        <nav className="max-w-[1280px] mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-10 py-4 sm:py-5">
          {/* Desktop nav — left */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            {navigation.map((item) => (
              <Link key={item.name} to={item.href} className={cn(navLinkClasses, 'whitespace-nowrap')}>
                {item.name}
              </Link>
            ))}
          </div>
          {/* Mobile: menu button occupies the left slot */}
          <div className="lg:hidden flex items-center">
            <button
              className="p-2 -ml-2 text-journal-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Logo — center */}
          <div className="flex items-center justify-center">
            <BrandLogo variant="header" to="/" imgClassName="h-9 sm:h-10 max-w-[220px] sm:max-w-[260px]" />
          </div>

          {/* Right cluster */}
          <div className="flex items-center justify-end gap-4 sm:gap-6">
            {isAuthenticated && (
              <Link to="/wishlist" className="relative p-1 text-journal-ink hover:text-journal-teal transition-colors" aria-label="Wishlist">
                <Heart className={`h-5 w-5 ${wishlistCount > 0 ? 'fill-journal-danger-text text-journal-danger-text' : ''}`} />
                {wishlistCount > 0 && (
                  <span
                    key={wishlistCount}
                    className={`absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-journal-danger-text text-white text-[10px] font-sans font-semibold flex items-center justify-center transition-transform duration-300 ${
                      isCountAnimating ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            <Link to="/cart" className="relative p-1 text-journal-ink hover:text-journal-teal transition-colors" aria-label="Shopping cart">
              <ShoppingCart className="h-5 w-5" />
              {cart.totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-journal-ink text-journal-bone text-[10px] font-sans font-semibold flex items-center justify-center">
                  {cart.totalItems}
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <div className="hidden lg:flex items-center gap-4 xl:gap-5 text-[12px] font-sans font-medium tracking-[0.1em] uppercase">
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin/dashboard" className="flex items-center gap-1.5 whitespace-nowrap text-journal-ink-nav hover:text-journal-teal transition-colors">
                    <Settings className="h-4 w-4 shrink-0" />
                    Admin
                  </Link>
                )}
                {user.role === UserRole.MECHANIC && (
                  <Link to="/mechanic/jobs" className="flex items-center gap-1.5 whitespace-nowrap text-journal-ink-nav hover:text-journal-teal transition-colors">
                    <Wrench className="h-4 w-4 shrink-0" />
                    My Jobs
                  </Link>
                )}
                <Link to="/profile" className="flex items-center gap-1.5 whitespace-nowrap text-journal-ink-nav hover:text-journal-teal transition-colors normal-case tracking-normal max-w-[140px]">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1.5 whitespace-nowrap text-journal-ink-nav hover:text-journal-teal transition-colors">
                  <LogOut className="h-4 w-4 shrink-0" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-3 xl:gap-4 text-[12px] font-sans font-medium tracking-[0.12em] uppercase">
                <Link to="/login" className="whitespace-nowrap text-journal-ink-nav hover:text-journal-teal transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="whitespace-nowrap border border-journal-ink text-journal-ink px-3 lg:px-4 py-2.5 hover:bg-journal-ink hover:text-journal-bone transition-colors">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-journal-hairline">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-4 flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="px-2 py-2.5 text-[13px] font-sans font-medium tracking-[0.1em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {isAuthenticated && user ? (
                <>
                  {user.role === UserRole.ADMIN && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2 px-2 py-2.5 text-[13px] font-sans font-medium tracking-[0.1em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                  {user.role === UserRole.MECHANIC && (
                    <Link
                      to="/mechanic/jobs"
                      className="flex items-center gap-2 px-2 py-2.5 text-[13px] font-sans font-medium tracking-[0.1em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Wrench className="h-4 w-4" />
                      My Jobs
                    </Link>
                  )}
                  <div className="border-t border-journal-hairline mt-2 pt-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-2 py-2.5 text-[13px] font-sans font-medium text-journal-ink-nav hover:text-journal-teal transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {user.name}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-2 py-2.5 text-[13px] font-sans font-medium tracking-[0.1em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t border-journal-hairline mt-2 pt-3 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2 py-2.5 text-[13px] font-sans font-medium tracking-[0.1em] uppercase text-journal-ink-nav hover:text-journal-teal transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="border border-journal-ink text-journal-ink text-center px-4 py-2.5 text-[12px] font-sans font-medium tracking-[0.12em] uppercase hover:bg-journal-ink hover:text-journal-bone transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
