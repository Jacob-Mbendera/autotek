import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { logout } from '../store/slices/authSlice';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Button } from './ui/Button';
import { BrandLogo } from './BrandLogo';

export const AdminHeader = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-3">
        <Link
          to="/admin/dashboard"
          className="flex shrink-0 items-center md:min-w-[140px]"
          aria-label="Admin dashboard home"
        >
          <BrandLogo variant="admin" imgClassName="h-8 w-auto max-w-[140px] sm:max-w-[160px]" />
        </Link>
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders, parts, or mechanics..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {/* Right Side - Notifications and User */}
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile and Logout */}
          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-700">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-50">
                {user?.name || 'Admin User'}
              </div>
              <div className="text-xs text-gray-400">
                {user?.role === 'admin' ? 'Administrator' : 'Operations Lead'}
              </div>
            </div>
            <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
            </div>
            <Button
              variant="ghost"
              size="small"
              onClick={handleLogout}
              className="text-gray-400 hover:text-white ml-2"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
