import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { Button } from './ui/Button';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Wrench,
  FileText,
  Settings,
  HelpCircle,
  Plus,
  Truck,
  Menu,
  X,
  Users,
} from 'lucide-react';

export const AdminSidebar = () => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Services', href: '/admin/services', icon: Wrench },
    { name: 'Custom Orders', href: '/admin/custom-orders', icon: FileText },
    { name: 'Users', href: '/admin/users', icon: Users },
  ];

  const systemItems = [
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Support', href: '/admin/support', icon: HelpCircle },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-gray-700 flex-col z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:flex`}
      >
      {/* Logo and Branding */}
      <div className="p-6 border-b border-gray-700">
        <Link to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
          <div className="h-10 w-10 bg-teal-500 rounded-lg flex items-center justify-center">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg">AutoTek Admin</div>
            <div className="text-gray-400 text-xs">Malawi Operations</div>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* System Section */}
        <div className="px-6 mt-8 mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            System
          </div>
          <div className="space-y-1">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-teal-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Primary Action Button */}
      <div className="p-4 border-t border-gray-700">
        <Button
          variant="primary"
          className="w-full bg-teal-500 hover:bg-teal-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>
    </aside>
    </>
  );
};
