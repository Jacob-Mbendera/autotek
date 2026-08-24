import { baseApi } from './baseApi';

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

export const configApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBankTransferDetails: builder.query<BankTransferDetails, void>({
      query: () => '/config/bank-transfer',
    }),
  }),
});

export const { useGetBankTransferDetailsQuery } = configApi;
