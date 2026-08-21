import { baseApi } from './baseApi';

export interface ContactMessageRequest {
  name: string;
  email: string;
  message: string;
  reason?: string;
}

export const contactApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendContactMessage: builder.mutation<{ message: string }, ContactMessageRequest>({
      query: (body) => ({
        url: '/contact',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSendContactMessageMutation } = contactApi;
