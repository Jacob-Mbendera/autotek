import { baseApi } from './baseApi';
import type { ServiceStatus, ServiceType } from '../../../../shared/types';

export interface TowingService {
  _id: string;
  user: string;
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: ServiceStatus;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  };
  preferredDate?: string;
  preferredTime?: string;
  status: ServiceStatus;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateTowingServiceRequest {
  vehicleType: string;
  vehicleModel?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
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
  preferredDate?: string;
  preferredTime?: string;
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
      { id: string; status?: ServiceStatus; assignedDriver?: string; price?: number }
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
      { id: string; status?: ServiceStatus; assignedMechanic?: string; price?: number; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/car-services/${id}`,
        method: 'PUT',
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
} = serviceApi;
