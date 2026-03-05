import { HelpCircle, Construction } from 'lucide-react';
import { AdminCard } from '../../components/ui/AdminCard';
import { H1, Body } from '../../components/ui/Typography';

export const AdminSupport = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-8 w-8 text-teal-500" />
        <H1>Support</H1>
      </div>

      <AdminCard>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="mb-6 p-4 bg-slate-800 rounded-full">
            <Construction className="h-16 w-16 text-teal-500" />
          </div>
          <H1 className="text-3xl mb-4 text-gray-50">Coming Soon</H1>
          <Body className="text-lg text-gray-400 max-w-md">
            We're building a support center where you'll be able to access help documentation, submit tickets, and get assistance with the admin panel.
          </Body>
        </div>
      </AdminCard>
    </div>
  );
};
