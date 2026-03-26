import { baseApi } from './baseApi';

export interface Landmark {
  _id: string;
  name: string;
  active: boolean;
}

export interface DeliveryLocation {
  _id: string;
  town: string;
  landmarks: Landmark[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryLocationsResponse {
  deliveryLocations: DeliveryLocation[];
}

interface CreateTownRequest {
  town: string;
  landmarks: string[];
}

interface UpdateTownRequest {
  town?: string;
  active?: boolean;
}

interface CreateLandmarkRequest {
  name: string;
}

interface UpdateLandmarkRequest {
  name?: string;
  active?: boolean;
}

export const deliveryLocationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Public endpoint
    getDeliveryLocations: builder.query<DeliveryLocationsResponse, void>({
      query: () => '/delivery-locations',
      providesTags: ['DeliveryLocation'],
    }),

    // Admin endpoints
    createTown: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, CreateTownRequest>({
      query: (body) => ({
        url: '/delivery-locations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),

    updateTown: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, { id: string; data: UpdateTownRequest }>({
      query: ({ id, data }) => ({
        url: `/delivery-locations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),

    deleteTown: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, string>({
      query: (id) => ({
        url: `/delivery-locations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),

    createLandmark: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, { townId: string; data: CreateLandmarkRequest }>({
      query: ({ townId, data }) => ({
        url: `/delivery-locations/${townId}/landmarks`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),

    updateLandmark: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, { townId: string; landmarkId: string; data: UpdateLandmarkRequest }>({
      query: ({ townId, landmarkId, data }) => ({
        url: `/delivery-locations/${townId}/landmarks/${landmarkId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),

    deleteLandmark: builder.mutation<{ message: string; deliveryLocation: DeliveryLocation }, { townId: string; landmarkId: string }>({
      query: ({ townId, landmarkId }) => ({
        url: `/delivery-locations/${townId}/landmarks/${landmarkId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DeliveryLocation'],
    }),
  }),
});

export const {
  useGetDeliveryLocationsQuery,
  useCreateTownMutation,
  useUpdateTownMutation,
  useDeleteTownMutation,
  useCreateLandmarkMutation,
  useUpdateLandmarkMutation,
  useDeleteLandmarkMutation,
} = deliveryLocationApi;
