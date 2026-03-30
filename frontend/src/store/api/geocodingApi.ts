import { baseApi } from './baseApi';

export interface ReverseGeocodeResponse {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const geocodingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    reverseGeocode: builder.mutation<
      ReverseGeocodeResponse,
      { latitude: number; longitude: number }
    >({
      query: (body) => ({
        url: '/geocoding/reverse',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useReverseGeocodeMutation } = geocodingApi;
