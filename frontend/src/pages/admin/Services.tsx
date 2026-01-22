import { useState } from 'react';
import { useGetAllServicesQuery } from '../../store/api/adminApi';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, Body } from '../../components/ui/Typography';
import { Search, Filter, Eye, Loader2, Wrench, Truck, Package } from 'lucide-react';
import { ServiceStatus } from '../../../../shared/types';

export const AdminServices = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<'towing' | 'car-service' | ''>('');

  const { data, isLoading } = useGetAllServicesQuery({
    page,
    limit,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.PENDING:
        return 'bg-amber-500/20 text-amber-500';
      case ServiceStatus.ASSIGNED:
        return 'bg-blue-500/20 text-blue-500';
      case ServiceStatus.IN_PROGRESS:
        return 'bg-purple-500/20 text-purple-500';
      case ServiceStatus.COMPLETED:
        return 'bg-green-500/20 text-green-500';
      case ServiceStatus.CANCELLED:
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredServices = data?.services
    ? (data.services as any[]).filter((service) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            service._id?.toLowerCase().includes(searchLower) ||
            service.user?.name?.toLowerCase().includes(searchLower) ||
            service.user?.email?.toLowerCase().includes(searchLower) ||
            (service.serviceType && service.serviceType.toLowerCase().includes(searchLower)) ||
            (service.location && service.location.toLowerCase().includes(searchLower))
          );
        }
        return true;
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Service Management</H1>
        <Body className="text-gray-400">View and manage all service requests</Body>
      </div>

      {/* Filters */}
      <AdminCard variant="default" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                dark
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'towing' | 'car-service' | '')}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Types</option>
              <option value="towing">Towing</option>
              <option value="car-service">Car Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | '')}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value={ServiceStatus.PENDING}>Pending</option>
              <option value={ServiceStatus.ASSIGNED}>Assigned</option>
              <option value={ServiceStatus.IN_PROGRESS}>In Progress</option>
              <option value={ServiceStatus.COMPLETED}>Completed</option>
              <option value={ServiceStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              dark
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </AdminCard>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <AdminCard variant="table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Details</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <Body className="text-gray-400">No services found</Body>
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service: any) => (
                    <tr key={service._id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {service.type === 'towing' ? (
                            <Truck className="h-5 w-5 text-teal-500" />
                          ) : (
                            <Wrench className="h-5 w-5 text-teal-500" />
                          )}
                          <Body className="font-medium text-gray-50 capitalize">
                            {service.type === 'towing' ? 'Towing' : 'Car Service'}
                          </Body>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <Body className="font-medium text-gray-50">
                            {service.user?.name || 'N/A'}
                          </Body>
                          <Body className="text-sm text-gray-400">{service.user?.email || ''}</Body>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {service.type === 'towing' ? (
                            <Body className="text-sm text-gray-300">
                              Vehicle: {service.vehicleMake || 'N/A'} {service.vehicleModel || ''}
                            </Body>
                          ) : (
                            <Body className="text-sm text-gray-300 capitalize">
                              {service.serviceType || 'N/A'}
                            </Body>
                          )}
                          {service.description && (
                            <Body className="text-xs text-gray-400 line-clamp-1">
                              {service.description}
                            </Body>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-300">
                          {service.location || 'N/A'}
                        </Body>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            service.status
                          )}`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-400">
                          {new Date(service.createdAt).toLocaleDateString()}
                        </Body>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="small" dark>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination && (data.pagination as any).totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
              <Body className="text-gray-400">
                Showing {((page - 1) * limit) + 1} to{' '}
                {Math.min(page * limit, (data.pagination as any).total)} of{' '}
                {(data.pagination as any).total} services
              </Body>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (data.pagination as any).totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
};
