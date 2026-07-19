import { baseApi } from './baseApi';
import type { CustomOrderStatus } from '../../../../shared/types';

export type PartPreference =
  | 'genuine-oem'
  | 'new-aftermarket'
  | 'used-reconditioned'
  | 'no-preference';

export type PartPosition =
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'front-left'
  | 'front-right'
  | 'rear-left'
  | 'rear-right'
  | 'inner'
  | 'outer'
  | 'driver'
  | 'passenger'
  | 'not-applicable';

export type Transmission = 'automatic' | 'manual' | 'cvt' | 'not-sure';
export type Drivetrain = 'fwd' | 'rwd' | 'awd-4wd' | 'not-sure';
export type BodyStyle =
  | 'sedan'
  | 'hatchback'
  | 'wagon'
  | 'pickup'
  | 'suv'
  | 'other'
  | 'not-sure';

export interface VehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  trim?: string;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  bodyStyle?: BodyStyle;
  vinOrChassis?: string;
}

export interface PartDetails {
  position?: PartPosition;
  partNumber?: string;
  quantity?: number;
  preference?: PartPreference;
}

export interface CustomOrderCustomer {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CustomOrder {
  _id: string;
  user: string | CustomOrderCustomer;
  productName: string;
  description: string;
  category: string;
  estimatedPrice?: number;
  status: CustomOrderStatus;
  supplier?: string;
  notes?: string;
  vehicleDetails?: VehicleDetails;
  partDetails?: PartDetails;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomOrderRequest {
  productName: string;
  description: string;
  category: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  position: PartPosition;
  quantity: number;
  trim?: string;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  bodyStyle?: BodyStyle;
  vinOrChassis?: string;
  partNumber?: string;
  preference?: PartPreference;
  estimatedPrice?: number;
  images?: File[];
}

interface CustomOrdersResponse {
  customOrders: CustomOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CustomOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: CustomOrderStatus;
}

const normalizeCustomOrder = (
  response: CustomOrder | { customOrder: CustomOrder }
): { customOrder: CustomOrder } => {
  if ('customOrder' in response) {
    return response;
  }

  return { customOrder: response };
};

const normalizeCustomOrders = (
  response: CustomOrder[] | CustomOrdersResponse
): CustomOrdersResponse => {
  if (Array.isArray(response)) {
    return { customOrders: response };
  }

  return response;
};

const appendIfPresent = (formData: FormData, key: string, value?: string | number) => {
  if (value === undefined || value === null || value === '') return;
  formData.append(key, String(value));
};

export const customOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCustomOrder: builder.mutation<{ customOrder: CustomOrder }, CreateCustomOrderRequest>({
      query: (data) => {
        const formData = new FormData();
        formData.append('productName', data.productName);
        formData.append('description', data.description);
        formData.append('category', data.category);
        formData.append('make', data.make);
        formData.append('model', data.model);
        formData.append('year', String(data.year));
        formData.append('engine', data.engine);
        formData.append('position', data.position);
        formData.append('quantity', String(data.quantity));
        appendIfPresent(formData, 'trim', data.trim);
        appendIfPresent(formData, 'transmission', data.transmission);
        appendIfPresent(formData, 'drivetrain', data.drivetrain);
        appendIfPresent(formData, 'bodyStyle', data.bodyStyle);
        appendIfPresent(formData, 'vinOrChassis', data.vinOrChassis);
        appendIfPresent(formData, 'partNumber', data.partNumber);
        appendIfPresent(formData, 'preference', data.preference);
        appendIfPresent(formData, 'estimatedPrice', data.estimatedPrice);

        if (data.images && data.images.length > 0) {
          data.images.forEach((file) => {
            formData.append('images', file);
          });
        }

        return {
          url: '/custom-orders',
          method: 'POST',
          body: formData,
          headers: {},
        };
      },
      transformResponse: (response: CustomOrder | { customOrder: CustomOrder }) =>
        normalizeCustomOrder(response),
      invalidatesTags: ['CustomOrder', 'Admin'],
    }),
    getCustomOrders: builder.query<CustomOrdersResponse, CustomOrdersQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/custom-orders';
        }
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.status) searchParams.append('status', params.status);

        return {
          url: `/custom-orders?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      transformResponse: (response: CustomOrder[] | CustomOrdersResponse) =>
        normalizeCustomOrders(response),
      providesTags: ['CustomOrder'],
    }),
    getCustomOrder: builder.query<{ customOrder: CustomOrder }, string>({
      query: (id) => `/custom-orders/${id}`,
      transformResponse: (response: CustomOrder | { customOrder: CustomOrder }) =>
        normalizeCustomOrder(response),
      providesTags: (_result, _error, id) => [{ type: 'CustomOrder', id }],
    }),
    updateCustomOrder: builder.mutation<
      CustomOrder,
      { id: string; status?: CustomOrderStatus; estimatedPrice?: number; supplier?: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/custom-orders/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['CustomOrder', 'Admin'],
    }),
  }),
});

export const {
  useCreateCustomOrderMutation,
  useGetCustomOrdersQuery,
  useGetCustomOrderQuery,
  useUpdateCustomOrderMutation,
} = customOrderApi;
