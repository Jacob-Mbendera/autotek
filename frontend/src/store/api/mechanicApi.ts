import { baseApi } from './baseApi';
import type { CarService, TowingService } from './serviceApi';

interface MyAssignedServicesResponse {
  carServices: CarService[];
  towingServices: TowingService[];
}

export const mechanicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAssignedServices: builder.query<MyAssignedServicesResponse, void>({
      query: () => '/mechanic/services',
      providesTags: ['CarService', 'TowingService'],
    }),
    updateMyServiceStatus: builder.mutation<
      CarService | TowingService,
      { type: 'car-service' | 'towing'; id: string }
    >({
      query: ({ type, id }) => ({
        url: `/mechanic/services/${type}/${id}/status`,
        method: 'PATCH',
      }),
      invalidatesTags: ['CarService', 'TowingService', 'Admin'],
    }),
  }),
});

export const { useGetMyAssignedServicesQuery, useUpdateMyServiceStatusMutation } = mechanicApi;
