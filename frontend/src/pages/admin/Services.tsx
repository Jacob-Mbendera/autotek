import { useState, useEffect } from 'react';
import { useGetAllServicesQuery, useGetProvidersForAssignmentQuery } from '../../store/api/adminApi';
import { useUpdateTowingServiceMutation, useUpdateCarServiceMutation } from '../../store/api/serviceApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { H1, Body } from '../../components/ui/Typography';
import { Search, Filter, Eye, Loader2, Wrench, Truck, Package, X, MapPin, Calendar, User, Users, Phone, Mail, Banknote, Save, ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { ServiceStatus } from '@shared/types';
import {
  assertValidServiceStatusTransition,
  getAllowedNextServiceStatuses,
  getServiceStatusLabel,
} from '@shared/utils/serviceStatusTransitions';
import { ETA_REQUIRES_PROVIDER_MESSAGE } from '@shared/utils/serviceEtaRules';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';

const formatCarServiceTypes = (service: any): string => {
  const types = Array.isArray(service.serviceTypes) && service.serviceTypes.length > 0
    ? service.serviceTypes
    : service.serviceType
      ? [service.serviceType]
      : [];
  return types.length > 0 ? types.join(', ') : 'N/A';
};

const toRequestedCarServiceTypes = (service: any): string[] => {
  const types = Array.isArray(service?.serviceTypes) && service.serviceTypes.length > 0
    ? service.serviceTypes
    : service?.serviceType
      ? [service.serviceType]
      : [];
  return types.map(String);
};

const toPricingInputMap = (service: any): Record<string, string> => {
  const byType = new Map<string, string>();
  if (Array.isArray(service?.servicePricing)) {
    service.servicePricing.forEach((entry: { serviceType?: string; price?: number }) => {
      if (!entry?.serviceType) return;
      byType.set(String(entry.serviceType), entry.price != null ? String(Math.round(Number(entry.price))) : '');
    });
  }
  const out: Record<string, string> = {};
  toRequestedCarServiceTypes(service).forEach((type) => {
    out[type] = byType.get(type) ?? '';
  });
  return out;
};

const serviceTypeLabel = (type: string): string =>
  type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

function assigneeIdFromSelectedService(s: { type?: string; assignedDriver?: unknown; assignedMechanic?: unknown }) {
  if (s.type === 'towing') {
    const a = s.assignedDriver;
    if (!a) return '';
    return typeof a === 'object' && a !== null && '_id' in a ? String((a as { _id: string })._id) : String(a);
  }
  const a = s.assignedMechanic;
  if (!a) return '';
  return typeof a === 'object' && a !== null && '_id' in a ? String((a as { _id: string })._id) : String(a);
}

function hasProviderOnService(
  s: { type?: string; assignedDriver?: unknown; assignedMechanic?: unknown },
  providerPickId?: string
): boolean {
  if (providerPickId?.trim()) return true;
  return Boolean(assigneeIdFromSelectedService(s));
}

function isoToDateValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToTimeValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateAndTimeToIso(date: string, time: string): string | null {
  if (!date && !time) return null;
  if (date && !time) return null;
  const useDate = date || isoToDateValue(new Date().toISOString());
  const d = new Date(`${useDate}T${time || '09:00'}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function etaPresetFromNow(minutesFromNow: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return { date: isoToDateValue(d.toISOString()), time: isoToTimeValue(d.toISOString()) };
}

const etaFieldClassName =
  'w-full px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none';

export const AdminServices = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<'towing' | 'car-service' | ''>('');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<ServiceStatus | ''>('');
  const [priceMwInput, setPriceMwInput] = useState('');
  const [carServicePriceInputs, setCarServicePriceInputs] = useState<Record<string, string>>({});
  const [providerPickId, setProviderPickId] = useState('');
  const [etaDateInput, setEtaDateInput] = useState('');
  const [etaTimeInput, setEtaTimeInput] = useState('');

  const [updateTowingService, { isLoading: isUpdatingTowing }] = useUpdateTowingServiceMutation();
  const [updateCarService, { isLoading: isUpdatingCar }] = useUpdateCarServiceMutation();

  const adminListQueryOptions = useAdminListQueryOptions();

  const { data, isLoading, refetch } = useGetAllServicesQuery(
    {
      page,
      limit,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      search: searchTerm || undefined,
    },
    adminListQueryOptions
  );

  useEffect(() => {
    if (!data?.services?.length) return;
    setSelectedService((prev) => {
      if (!prev?._id) return prev;
      const fresh = (data.services as { _id: string }[]).find((s) => s._id === prev._id);
      if (!fresh) return prev;
      return { ...prev, ...fresh };
    });
  }, [data?.services]);

  // Set newStatus when service is selected
  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setNewStatus('');
    const p = service.price;
    setPriceMwInput(p != null && p > 0 ? String(Math.round(Number(p))) : '');
    setCarServicePriceInputs(toPricingInputMap(service));
    setProviderPickId(assigneeIdFromSelectedService(service));
    setEtaDateInput(isoToDateValue(service.estimatedArrivalAt));
    setEtaTimeInput(isoToTimeValue(service.estimatedArrivalAt));
  };

  const applyEtaPreset = (minutesFromNow: number) => {
    if (!providerPickId) {
      dispatch(
        showNotification({
          message: ETA_REQUIRES_PROVIDER_MESSAGE,
          type: 'warning',
        })
      );
      return;
    }
    const preset = etaPresetFromNow(minutesFromNow);
    setEtaDateInput(preset.date);
    setEtaTimeInput(preset.time);
  };

  const clearEtaInputs = () => {
    setEtaDateInput('');
    setEtaTimeInput('');
  };

  const providerTypeForAssign =
    selectedService?.type === 'towing' ? 'driver' : selectedService?.type === 'car-service' ? 'mechanic' : 'driver';
  const { data: assignData } = useGetProvidersForAssignmentQuery(
    { providerType: providerTypeForAssign },
    { skip: !selectedService }
  );

  const serviceHasProvider = selectedService
    ? hasProviderOnService(selectedService, providerPickId)
    : false;
  const allowedNextServiceStatuses = selectedService
    ? getAllowedNextServiceStatuses(
        selectedService.status,
        serviceHasProvider,
        selectedService.paymentStatus || 'pending'
      )
    : [];

  useEffect(() => {
    if (!selectedService || !newStatus) return;
    const hasProvider = hasProviderOnService(selectedService, providerPickId);
    const allowed = getAllowedNextServiceStatuses(
      selectedService.status,
      hasProvider,
      selectedService.paymentStatus || 'pending'
    );
    if (!allowed.includes(newStatus)) {
      setNewStatus('');
    }
  }, [selectedService, newStatus, providerPickId]);

  const handleSaveAssignmentEta = async () => {
    if (!selectedService) return;
    if (etaDateInput && !etaTimeInput) {
      dispatch(
        showNotification({
          message: 'Please pick an arrival time, or use a quick preset.',
          type: 'warning',
        })
      );
      return;
    }
    const etaIso = combineDateAndTimeToIso(etaDateInput, etaTimeInput);
    if (etaIso && !providerPickId) {
      dispatch(
        showNotification({
          message: ETA_REQUIRES_PROVIDER_MESSAGE,
          type: 'warning',
        })
      );
      return;
    }
    try {
      const wasPending = selectedService.status === ServiceStatus.PENDING;
      if (selectedService.type === 'towing') {
        const updated = await updateTowingService({
          id: selectedService._id,
          assignedDriver: providerPickId || null,
          estimatedArrivalAt: etaIso,
        }).unwrap();
        setSelectedService({ ...selectedService, ...updated, type: 'towing' });
      } else {
        const updated = await updateCarService({
          id: selectedService._id,
          assignedMechanic: providerPickId || null,
          estimatedArrivalAt: etaIso,
        }).unwrap();
        setSelectedService({ ...selectedService, ...updated, type: 'car-service' });
      }
      const assignedNow = Boolean(providerPickId);
      dispatch(
        showNotification({
          message:
            wasPending && assignedNow
              ? 'Provider saved. Status moved to Assigned.'
              : 'Assignment and ETA saved',
          type: 'success',
        })
      );
      await refetch();
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to save assignment');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedService || !newStatus) {
      return;
    }

    const transition = assertValidServiceStatusTransition(
      selectedService.status,
      newStatus as ServiceStatus,
      serviceHasProvider,
      selectedService.paymentStatus || 'pending'
    );
    if (!transition.ok) {
      dispatch(showNotification({ message: transition.message, type: 'error' }));
      return;
    }

    try {
      if (selectedService.type === 'towing') {
        await updateTowingService({
          id: selectedService._id,
          status: newStatus as ServiceStatus,
        }).unwrap();
      } else {
        await updateCarService({
          id: selectedService._id,
          status: newStatus as ServiceStatus,
        }).unwrap();
      }

      dispatch(showNotification({ message: 'Service status updated successfully!', type: 'success' }));
      await refetch();
      setSelectedService({ ...selectedService, status: newStatus });
      setNewStatus('');
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to update service status');
      dispatch(showNotification({ 
        message: errorInfo.message, 
        type: 'error' 
      }));
    }
  };

  const handleSavePriceMw = async () => {
    if (!selectedService) return;
    if (selectedService.status === 'cancelled') {
      dispatch(
        showNotification({
          message: 'Cannot set a price on a cancelled service.',
          type: 'error',
        })
      );
      return;
    }

    try {
      let updated: Record<string, unknown>;
      if (selectedService.type === 'towing') {
        const raw = priceMwInput.replace(/,/g, '').trim();
        const n = Number(raw);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
          dispatch(
            showNotification({
              message:
                'Enter a whole number of Malawi Kwacha (MWK), at least 1. No decimals.',
              type: 'error',
            })
          );
          return;
        }
        updated = (await updateTowingService({
          id: selectedService._id,
          price: n,
        }).unwrap()) as Record<string, unknown>;
        setPriceMwInput(String(n));
      } else {
        const serviceTypes = toRequestedCarServiceTypes(selectedService);
        if (serviceTypes.length === 0) {
          dispatch(showNotification({ message: 'No requested service types found', type: 'error' }));
          return;
        }
        const servicePricing = serviceTypes.map((serviceType) => {
          const raw = (carServicePriceInputs[serviceType] || '').replace(/,/g, '').trim();
          if (!raw) {
            return { serviceType, price: 0 };
          }
          const value = Number(raw);
          if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
            throw new Error(`Invalid price for ${serviceTypeLabel(serviceType)}`);
          }
          return { serviceType, price: value };
        });
        const total = servicePricing.reduce((sum, entry) => sum + entry.price, 0);
        updated = (await updateCarService({
          id: selectedService._id,
          servicePricing,
        }).unwrap()) as Record<string, unknown>;
        setPriceMwInput(String(total));
      }

      dispatch(
        showNotification({
          message: `Price saved successfully. The customer can pay from My Services.`,
          type: 'success',
        })
      );
      await refetch();
      setSelectedService({
        ...selectedService,
        ...(updated as Record<string, unknown>),
        paymentStatus: (updated.paymentStatus as string) ?? selectedService.paymentStatus,
        updatedAt: (updated.updatedAt as string) ?? selectedService.updatedAt,
      });
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to save price');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

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

  // Backend handles search, so no need for client-side filtering
  const filteredServices = data?.services || [];

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
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
              className="w-full gap-2"
            >
              <Filter className="h-4 w-4" />
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
                              {formatCarServiceTypes(service)}
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
                        <Button 
                          variant="ghost" 
                          size="small" 
                          dark
                          onClick={() => handleServiceSelect(service)}
                        >
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
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (data.pagination as any).totalPages}
                  className="gap-1.5"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <Card variant="lg" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {selectedService.type === 'towing' ? (
                  <Truck className="h-6 w-6 text-teal-500" />
                ) : (
                  <Wrench className="h-6 w-6 text-teal-500" />
                )}
                <H1 className="text-2xl font-bold text-gray-50">
                  {selectedService.type === 'towing' ? 'Towing Service' : 'Car Service'} Details
                </H1>
              </div>
              <Button
                variant="ghost"
                size="small"
                dark
                onClick={() => setSelectedService(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Status Update */}
              <div>
                <Body className="text-sm text-gray-400 mb-2">
                  Status — current:{' '}
                  <span className="font-semibold text-gray-200">
                    {getServiceStatusLabel(selectedService.status)}
                  </span>
                  {selectedService.paymentStatus ? (
                    <>
                      {' '}
                      · Payment:{' '}
                      <span
                        className={
                          selectedService.paymentStatus === 'completed'
                            ? 'font-semibold text-green-400'
                            : selectedService.paymentStatus === 'failed'
                              ? 'font-semibold text-red-400'
                              : 'font-semibold text-amber-400'
                        }
                      >
                        {selectedService.paymentStatus}
                      </span>
                    </>
                  ) : null}
                </Body>
                <div className="flex items-center gap-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ServiceStatus)}
                    className="flex-1 px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    disabled={allowedNextServiceStatuses.length === 0}
                  >
                    <option value="">Select new status...</option>
                    {allowedNextServiceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getServiceStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="small"
                    dark
                    onClick={handleStatusUpdate}
                    disabled={
                      !newStatus ||
                      isUpdatingTowing ||
                      isUpdatingCar ||
                      allowedNextServiceStatuses.length === 0
                    }
                    className="gap-2"
                  >
                    {isUpdatingTowing || isUpdatingCar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Update Status
                  </Button>
                </div>
                {!serviceHasProvider && selectedService.status !== ServiceStatus.CANCELLED && (
                  <Body className="text-xs text-amber-400 mt-2 bg-amber-950/40 border border-amber-800/50 rounded-md px-3 py-2">
                    No driver or mechanic assigned. Assign a provider before moving to Assigned or
                    any later step.
                  </Body>
                )}
                {serviceHasProvider &&
                  selectedService.paymentStatus !== 'completed' &&
                  selectedService.status !== ServiceStatus.CANCELLED &&
                  selectedService.status !== ServiceStatus.COMPLETED && (
                    <Body className="text-xs text-amber-400 mt-2 bg-amber-950/40 border border-amber-800/50 rounded-md px-3 py-2">
                      Payment is not completed ({selectedService.paymentStatus || 'pending'}). You
                      can assign a provider, but In Progress and Completed require payment first.
                    </Body>
                  )}
                {allowedNextServiceStatuses.length === 0 ? (
                  <Body className="text-xs text-gray-500 mt-2">
                    No further status changes are available for this service.
                  </Body>
                ) : (
                  <Body className="text-xs text-gray-500 mt-2">
                    Advance one step at a time: Assigned → In Progress → Completed. Payment must be
                    completed before In Progress. Cancel is allowed until the job is completed.
                  </Body>
                )}
              </div>

              {/* Customer Information */}
              <div>
                <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </Body>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Body className="text-gray-50 font-medium">
                      {selectedService.user?.name || 'N/A'}
                    </Body>
                  </div>
                  {selectedService.user?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <Body className="text-gray-300 text-sm">{selectedService.user.email}</Body>
                    </div>
                  )}
                  {selectedService.user?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <Body className="text-gray-300 text-sm">{selectedService.user.phone}</Body>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign provider & ETA
                </Body>
                <Body className="text-xs text-gray-500 mb-3">
                  Only vetted providers appear here. Active jobs count helps avoid overload.
                  Saving a provider on a pending service automatically moves it to Assigned.
                </Body>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <div>
                    <label htmlFor="admin-assign-provider" className="block text-xs text-gray-400 mb-1">
                      {selectedService.type === 'towing' ? 'Driver' : 'Mechanic'}
                    </label>
                    <select
                      id="admin-assign-provider"
                      value={providerPickId}
                      onChange={(e) => setProviderPickId(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    >
                      <option value="">Not assigned</option>
                      {(assignData?.providers ?? []).map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {typeof p.garage === 'object' && p.garage ? p.garage.name : 'Garage'} (
                          {p.activeAssignmentCount ?? 0} active)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Estimated arrival {providerPickId ? '(optional)' : ''}
                    </span>
                    {!providerPickId && (
                      <Body className="text-xs text-amber-400/90 mb-2">
                        Assign a provider before setting an estimated arrival time.
                      </Body>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="admin-service-eta-date" className="block text-xs text-gray-500 mb-1">
                          Date
                        </label>
                        <input
                          id="admin-service-eta-date"
                          type="date"
                          value={etaDateInput}
                          onChange={(e) => setEtaDateInput(e.target.value)}
                          disabled={!providerPickId}
                          className={`${etaFieldClassName} disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                      </div>
                      <div>
                        <label htmlFor="admin-service-eta-time" className="block text-xs text-gray-500 mb-1">
                          Time
                        </label>
                        <input
                          id="admin-service-eta-time"
                          type="time"
                          value={etaTimeInput}
                          onChange={(e) => setEtaTimeInput(e.target.value)}
                          disabled={!providerPickId}
                          className={`${etaFieldClassName} disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="secondary"
                        size="small"
                        dark
                        type="button"
                        disabled={!providerPickId}
                        onClick={() => applyEtaPreset(30)}
                      >
                        In 30 min
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        dark
                        type="button"
                        disabled={!providerPickId}
                        onClick={() => applyEtaPreset(60)}
                      >
                        In 1 hour
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        dark
                        type="button"
                        disabled={!providerPickId}
                        onClick={() => applyEtaPreset(120)}
                      >
                        In 2 hours
                      </Button>
                      {(etaDateInput || etaTimeInput) && (
                        <Button
                          variant="secondary"
                          size="small"
                          dark
                          type="button"
                          onClick={clearEtaInputs}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    dark
                    type="button"
                    onClick={handleSaveAssignmentEta}
                    disabled={isUpdatingTowing || isUpdatingCar}
                    className="gap-2"
                  >
                    {isUpdatingTowing || isUpdatingCar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save assignment & ETA
                  </Button>
                </div>
              </div>

              {(selectedService.quoteMobilePhone ||
                selectedService.quoteWhatsAppPhone ||
                selectedService.quoteRequestSubmittedAt) && (
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Quote request (call to confirm before pricing)
                  </Body>
                  <div className="bg-teal-900/20 border border-teal-700/40 rounded-lg p-4 space-y-2">
                    {selectedService.quoteRequestSubmittedAt && (
                      <Body className="text-xs text-gray-400">
                        Submitted:{' '}
                        {new Date(selectedService.quoteRequestSubmittedAt).toLocaleString()}
                      </Body>
                    )}
                    {selectedService.quoteMobilePhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-teal-400 shrink-0" />
                        <Body className="text-gray-200 text-sm">
                          Mobile: {selectedService.quoteMobilePhone}
                        </Body>
                      </div>
                    )}
                    {selectedService.quoteWhatsAppPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-teal-400 shrink-0" />
                        <Body className="text-gray-200 text-sm">
                          WhatsApp: {selectedService.quoteWhatsAppPhone}
                        </Body>
                      </div>
                    )}
                    {selectedService.quoteRequestNotes && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Customer note</Body>
                        <Body className="text-gray-300 text-sm">{selectedService.quoteRequestNotes}</Body>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin-set price (MWK) */}
              {selectedService.status !== 'cancelled' && (
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Customer price (MWK)
                  </Body>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <Body className="text-xs text-gray-400">
                      After you confirm details by phone or WhatsApp, enter the agreed quote. The customer will
                      see this amount and can pay online in MWK from My Services.
                    </Body>
                    {selectedService.price != null && selectedService.price > 0 && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Current saved price</Body>
                        <Body className="text-teal-400 font-semibold">
                          MWK {Number(selectedService.price).toLocaleString()}
                        </Body>
                      </div>
                    )}
                    {selectedService.type === 'car-service' ? (
                      <div className="space-y-3">
                        {toRequestedCarServiceTypes(selectedService).map((serviceType) => (
                          <div key={serviceType} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                {serviceTypeLabel(serviceType)} (MWK)
                              </label>
                              <Input
                                dark
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 15000"
                                value={carServicePriceInputs[serviceType] || ''}
                                onChange={(e) =>
                                  setCarServicePriceInputs((prev) => ({
                                    ...prev,
                                    [serviceType]: e.target.value.replace(/[^\d]/g, ''),
                                  }))
                                }
                                disabled={isUpdatingTowing || isUpdatingCar}
                              />
                            </div>
                            <Body className="text-xs text-gray-400 sm:pb-2">Per service price</Body>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-600 flex items-center justify-between">
                          <Body className="text-sm text-gray-300 font-semibold">Calculated total (MWK)</Body>
                          <Body className="text-sm text-teal-400 font-semibold">
                            {Object.values(carServicePriceInputs)
                              .reduce((sum, raw) => sum + (Number(raw || 0) || 0), 0)
                              .toLocaleString()}
                          </Body>
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          dark
                          type="button"
                          onClick={handleSavePriceMw}
                          disabled={isUpdatingTowing || isUpdatingCar}
                          className="gap-2 shrink-0"
                        >
                          {isUpdatingTowing || isUpdatingCar ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save service prices
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1">
                          <label htmlFor="admin-service-price-mwk" className="block text-xs text-gray-400 mb-1">
                            Amount (MWK)
                          </label>
                          <Input
                            dark
                            id="admin-service-price-mwk"
                            type="text"
                            inputMode="numeric"
                            placeholder="e.g. 85000"
                            value={priceMwInput}
                            onChange={(e) => setPriceMwInput(e.target.value.replace(/[^\d]/g, ''))}
                            disabled={isUpdatingTowing || isUpdatingCar}
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          dark
                          type="button"
                          onClick={handleSavePriceMw}
                          disabled={isUpdatingTowing || isUpdatingCar}
                          className="gap-2 shrink-0"
                        >
                          {isUpdatingTowing || isUpdatingCar ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save price
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Details */}
              <div>
                <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Service Details
                </Body>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  {selectedService.type === 'towing' ? (
                    <>
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Pickup Location</Body>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50">{selectedService.pickupLocation || 'N/A'}</Body>
                        </div>
                      </div>
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Destination</Body>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50">{selectedService.destination || 'N/A'}</Body>
                        </div>
                      </div>
                      {selectedService.vehicleDetails && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Vehicle Details</Body>
                          <Body className="text-gray-50">
                            {selectedService.vehicleDetails.make || 'N/A'} {selectedService.vehicleDetails.model || ''} 
                            {selectedService.vehicleDetails.year && ` (${selectedService.vehicleDetails.year})`}
                          </Body>
                          {selectedService.vehicleDetails.licensePlate && (
                            <Body className="text-gray-300 text-sm mt-1">
                              License: {selectedService.vehicleDetails.licensePlate}
                            </Body>
                          )}
                          {selectedService.vehicleDetails.color && (
                            <Body className="text-gray-300 text-sm">
                              Color: {selectedService.vehicleDetails.color}
                            </Body>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Service Type</Body>
                        <Body className="text-gray-50 capitalize">{formatCarServiceTypes(selectedService)}</Body>
                      </div>
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Address</Body>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50">{selectedService.address || 'N/A'}</Body>
                        </div>
                      </div>
                      {selectedService.preferredDate && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Preferred Date</Body>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <Body className="text-gray-50">
                              {new Date(selectedService.preferredDate).toLocaleDateString()}
                            </Body>
                          </div>
                        </div>
                      )}
                      {selectedService.vehicleDetails && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Vehicle Details</Body>
                          <Body className="text-gray-50">
                            {selectedService.vehicleDetails.make || 'N/A'} {selectedService.vehicleDetails.model || ''}
                            {selectedService.vehicleDetails.year && ` (${selectedService.vehicleDetails.year})`}
                          </Body>
                          {selectedService.vehicleDetails.licensePlate && (
                            <Body className="text-gray-300 text-sm mt-1">
                              License: {selectedService.vehicleDetails.licensePlate}
                            </Body>
                          )}
                        </div>
                      )}
                      {selectedService.notes && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Notes</Body>
                          <Body className="text-gray-50">{selectedService.notes}</Body>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Payment Information
                </Body>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div>
                    <Body className="text-xs text-gray-400 mb-1">Quoted price (MWK)</Body>
                    {selectedService.price != null && selectedService.price > 0 ? (
                      <Body className="text-gray-50 font-medium">
                        MWK {Number(selectedService.price).toLocaleString()}
                      </Body>
                    ) : (
                      <Body className="text-gray-500 text-sm">Not set — use Customer price (MWK) above</Body>
                    )}
                  </div>
                    {selectedService.paymentStatus && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Payment Status</Body>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            selectedService.paymentStatus === 'completed'
                              ? 'bg-green-500/20 text-green-500'
                              : selectedService.paymentStatus === 'failed'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-amber-500/20 text-amber-500'
                          }`}
                        >
                          {selectedService.paymentStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              {/* Dates */}
              <div>
                <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dates
                </Body>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div>
                    <Body className="text-xs text-gray-400 mb-1">Created</Body>
                    <Body className="text-gray-50">
                      {new Date(selectedService.createdAt).toLocaleString()}
                    </Body>
                  </div>
                  {selectedService.updatedAt && (
                    <div>
                      <Body className="text-xs text-gray-400 mb-1">Last Updated</Body>
                      <Body className="text-gray-50">
                        {new Date(selectedService.updatedAt).toLocaleString()}
                      </Body>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" dark onClick={() => setSelectedService(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
