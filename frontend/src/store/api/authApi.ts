import { baseApi } from './baseApi';
import type { User } from '../slices/authSlice';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  user: User;
  token: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    getMe: builder.query<{ user: User }, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<{ user: User }, UpdateProfileRequest>({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (body) => ({
        url: '/auth/password',
        method: 'PATCH',
        body,
      }),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useGetMeQuery, useUpdateProfileMutation, useChangePasswordMutation } = authApi;
