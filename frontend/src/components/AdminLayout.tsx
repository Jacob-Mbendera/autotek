import { type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <a href="#admin-main-content" className="skip-to-main">
        Skip to main content
      </a>
      <AdminSidebar />
      <div className="flex-1 flex flex-col w-full lg:ml-64">
        <AdminHeader />
        <main id="admin-main-content" className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
