import { type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col w-full lg:ml-64">
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
};
