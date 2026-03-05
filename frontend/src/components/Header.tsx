import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, LogOut, Package, Wrench, Truck, Settings, Heart } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/types';
import { logout } from '../store/slices/authSlice';
import { useGetWishlistQuery } from '../store/api/wishlistApi';
import { UserRole } from '@shared/types';
import { Button } from './ui/Button';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prevWishlistCount, setPrevWishlistCount] = useState(0);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart);
  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !isAuthenticated,
    // Optimistic updates handle freshness, so we don't need aggressive refetching
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
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

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navigation = [
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Orders', href: '/orders', icon: Package },
    { name: 'Services', href: '/services', icon: Wrench },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">AutoTek</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center space-x-1 text-gray-700 hover:text-teal-600 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side - Cart and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Wishlist - Only show if authenticated */}
            {isAuthenticated && (
              <Link
                to="/wishlist"
                className="relative p-2 text-gray-700 hover:text-red-600 transition-colors"
                aria-label="Wishlist"
              >
                <Heart className={`h-6 w-6 transition-all duration-200 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlistCount > 0 && (
                  <span
                    className={`absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      isCountAnimating ? 'scale-125 animate-pulse' : 'scale-100'
                    }`}
                    style={{
                      animation: isCountAnimating ? 'bounce 0.3s ease-in-out' : 'none',
                    }}
                    key={wishlistCount}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}
            
            {/* Shopping Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-teal-600 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {cart.totalItems > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {cart.totalItems}
                </span>
              )}
            </Link>

            {/* User Menu - Desktop */}
            {isAuthenticated && user ? (
              <div className="hidden md:flex md:items-center md:space-x-4">
                {user.role === UserRole.ADMIN && (
                  <Link to="/admin/dashboard">
                    <Button variant="ghost" size="small">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Link to="/profile">
                  <div className="flex items-center space-x-2 text-gray-700 hover:text-teal-600 transition-colors cursor-pointer">
                    <User className="h-5 w-5" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                </Link>
                <Button variant="ghost" size="small" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex md:items-center md:space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="small">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="small">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-700 hover:text-teal-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              {isAuthenticated && user ? (
                <>
                  {user.role === UserRole.ADMIN && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Admin</span>
                    </Link>
                  )}
                  <div className="px-4 py-2 border-t border-gray-200 mt-2">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-colors mb-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span className="font-medium">{user.name}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={handleLogout}
                      className="w-full justify-start"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="px-4 py-2 border-t border-gray-200 mt-2 space-y-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="small" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="small" className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
