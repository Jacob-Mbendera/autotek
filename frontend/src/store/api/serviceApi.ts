import { baseApi } from './baseApi';
import type { ServiceStatus, ServiceType } from '../../../../shared/types';

/** Populated assignee from API (or raw id if not populated). */
export interface ServiceAssignee {
  _id: string;
  name?: string;
  phone?: string;
  garage?: { _id?: string; name?: string; town?: string; verificationStatus?: string };
}

export interface TowingService {
  _id: string;
  user: string;
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    description?: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
    description?: string;
  };
  status: ServiceStatus;
  estimatedCost?: number;
  payment?: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  quoteMobilePhone?: string;
  quoteWhatsAppPhone?: string;
  quoteRequestNotes?: string;
  quoteRequestSubmittedAt?: string;
  pickupLocationMethod?: 'pin' | 'structured';
  destinationLocationMethod?: 'pin' | 'structured';
  createdAt: string;
  updatedAt: string;
  assignedDriver?: ServiceAssignee | string;
  estimatedArrivalAt?: string;
  etaUpdatedAt?: string;
}

export interface CarService {
  _id: string;
  user: string;
  serviceType: ServiceType;
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    description?: string;
  };
  preferredDate?: string;
  preferredTime?: string;
  status: ServiceStatus;
  estimatedCost?: number;
  payment?: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  quoteMobilePhone?: string;
  quoteWhatsAppPhone?: string;
  quoteRequestNotes?: string;
  quoteRequestSubmittedAt?: string;
  serviceLocationMethod?: 'pin' | 'structured';
  createdAt: string;
  updatedAt: string;
  assignedMechanic?: ServiceAssignee | string;
  estimatedArrivalAt?: string;
  etaUpdatedAt?: string;
}

interface CreateTowingServiceRequest {
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  pickupDescription?: string;
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinationDescription?: string;
  notes?: string;
}

interface CreateCarServiceRequest {
  serviceType: ServiceType;
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  addressDescription?: string;
  preferredDate?: string;
  notes?: string;
}

interface TowingServicesResponse {
  services: TowingService[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CarServicesResponse {
  services: CarService[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceQuoteRequestBody {
  mobilePhone: string;
  whatsAppPhone: string;
  quoteRequestNotes?: string;
}

interface ServicesQueryParams {
  page?: number;
  limit?: number;
  status?: ServiceStatus;
}

export const serviceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTowingService: builder.mutation<{ service: TowingService }, CreateTowingServiceRequest>({
      query: (body) => ({
        url: '/towing',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TowingService'],
    }),
    getTowingServices: builder.query<TowingServicesResponse, ServicesQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/towing';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        return {
          url: `/towing?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['TowingService'],
    }),
    getTowingService: builder.query<{ service: TowingService }, string>({
      query: (id) => `/towing/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'TowingService', id }],
    }),
    createCarService: builder.mutation<{ service: CarService }, CreateCarServiceRequest>({
      query: (body) => ({
        url: '/car-services',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CarService'],
    }),
    getCarServices: builder.query<CarServicesResponse, ServicesQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/car-services';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        return {
          url: `/car-services?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['CarService'],
    }),
    getCarService: builder.query<{ service: CarService }, string>({
      query: (id) => `/car-services/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'CarService', id }],
    }),
    updateTowingService: builder.mutation<
      TowingService,
      {
        id: string;
        status?: ServiceStatus;
        assignedDriver?: string | null;
        price?: number;
        estimatedArrivalAt?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/towing/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['TowingService', 'Admin'],
    }),
    updateCarService: builder.mutation<
      CarService,
      {
        id: string;
        status?: ServiceStatus;
        assignedMechanic?: string | null;
        price?: number;
        notes?: string;
        estimatedArrivalAt?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/car-services/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CarService', 'Admin'],
    }),
    cancelTowingService: builder.mutation<
      { message: string; service: TowingService; refund: any },
      string
    >({
      query: (id) => ({
        url: `/towing/${id}/cancel`,
        method: 'PUT',
      }),
      invalidatesTags: ['TowingService'],
    }),
    cancelCarService: builder.mutation<
      { message: string; service: CarService; refund: any },
      string
    >({
      query: (id) => ({
        url: `/car-services/${id}/cancel`,
        method: 'PUT',
      }),
      invalidatesTags: ['CarService'],
    }),
    requestTowingQuote: builder.mutation<{ message: string }, { id: string; body: ServiceQuoteRequestBody }>({
      query: ({ id, body }) => ({
        url: `/towing/${id}/quote-request`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TowingService', 'Admin'],
    }),
    requestCarServiceQuote: builder.mutation<{ message: string }, { id: string; body: ServiceQuoteRequestBody }>({
      query: ({ id, body }) => ({
        url: `/car-services/${id}/quote-request`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CarService', 'Admin'],
    }),
    rateTowingProvider: builder.mutation<{ message: string }, { id: string; rating: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/towing/${id}/provider-rating`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TowingService', 'Admin'],
    }),
    rateCarServiceProvider: builder.mutation<{ message: string }, { id: string; rating: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/car-services/${id}/provider-rating`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CarService', 'Admin'],
    }),
  }),
});

export const {
  useCreateTowingServiceMutation,
  useGetTowingServicesQuery,
  useGetTowingServiceQuery,
  useCreateCarServiceMutation,
  useGetCarServicesQuery,
  useGetCarServiceQuery,
  useUpdateTowingServiceMutation,
  useUpdateCarServiceMutation,
  useCancelTowingServiceMutation,
  useCancelCarServiceMutation,
  useRequestTowingQuoteMutation,
  useRequestCarServiceQuoteMutation,
  useRateTowingProviderMutation,
  useRateCarServiceProviderMutation,
} = serviceApi;
