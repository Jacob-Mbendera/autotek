import { useGetMyAssignedServicesQuery, useUpdateMyServiceStatusMutation } from '../../store/api/mechanicApi';
import type { CarService, TowingService } from '../../store/api/serviceApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { H1, H2, Body } from '../../components/ui/Typography';
import { Loader2, Wrench, Truck, MapPin, User, ArrowRight } from 'lucide-react';
import { getServiceStatusLabel } from '@shared/utils/serviceStatusTransitions';
import { ServiceStatus } from '@shared/types';
import { format } from 'date-fns';

const NEXT_STATUS: Partial<Record<ServiceStatus, ServiceStatus>> = {
  [ServiceStatus.ASSIGNED]: ServiceStatus.IN_PROGRESS,
  [ServiceStatus.IN_PROGRESS]: ServiceStatus.COMPLETED,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500/20 text-gray-300',
  assigned: 'bg-blue-500/20 text-blue-300',
  'in-progress': 'bg-amber-500/20 text-amber-300',
  completed: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

function JobCard({
  kind,
  job,
  onAdvance,
  isUpdating,
}: {
  kind: 'car-service' | 'towing';
  job: CarService | TowingService;
  onAdvance: (kind: 'car-service' | 'towing', id: string) => void;
  isUpdating: boolean;
}) {
  const nextStatus = NEXT_STATUS[job.status];
  const customer = typeof job.user === 'object' ? (job.user as { name?: string }).name : undefined;
  const Icon = kind === 'car-service' ? Wrench : Truck;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <Body className="text-gray-50 font-medium">
              {kind === 'car-service' ? 'Car Service' : 'Towing'} #{job._id.slice(-8).toUpperCase()}
            </Body>
            {customer && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                <User className="h-3.5 w-3.5" />
                {customer}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location?.address || 'No address provided'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[job.status] || 'bg-gray-500/20 text-gray-300'}`}>
          {getServiceStatusLabel(job.status)}
        </span>
      </div>

      {nextStatus && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <Button
            variant="primary"
            className="gap-2"
            disabled={isUpdating}
            onClick={() => onAdvance(kind, job._id)}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Advance to {getServiceStatusLabel(nextStatus)}
          </Button>
        </div>
      )}
    </Card>
  );
}

export const MyJobs = () => {
  const { data, isLoading, refetch } = useGetMyAssignedServicesQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateMyServiceStatusMutation();
  const dispatch = useAppDispatch();

  const handleAdvance = async (type: 'car-service' | 'towing', id: string) => {
    try {
      await updateStatus({ type, id }).unwrap();
      dispatch(showNotification({ message: 'Job status updated', type: 'success' }));
      await refetch();
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to update job status');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const jobs = [
    ...(data?.carServices || []).map((job) => ({ kind: 'car-service' as const, job })),
    ...(data?.towingServices || []).map((job) => ({ kind: 'towing' as const, job })),
  ];

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">My Jobs</H1>
        <Body className="text-gray-400">Jobs assigned to you</Body>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-10 text-center">
          <H2 className="text-gray-300 mb-1">No jobs assigned yet</H2>
          <Body className="text-gray-500">Jobs assigned to you will show up here.</Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map(({ kind, job }) => (
            <JobCard
              key={job._id}
              kind={kind}
              job={job}
              onAdvance={handleAdvance}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
};
