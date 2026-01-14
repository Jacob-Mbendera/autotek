import axios from 'axios';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

interface AirtelConfig {
  AIRTEL_BASE_URL: string;
  CLIENT_ID: string | undefined;
  CLIENT_SECRET: string | undefined;
  GRANT_TYPE: string;
  COUNTRY: string;
  CURRENCY: string;
  API_VERSION: string;
}

const getConfig = (): AirtelConfig => {
  return {
    AIRTEL_BASE_URL: process.env.AIRTEL_API_URL || 'https://openapiuat.airtel.africa',
    CLIENT_ID: process.env.AIRTEL_CLIENT_ID,
    CLIENT_SECRET: process.env.AIRTEL_CLIENT_SECRET,
    GRANT_TYPE: 'client_credentials',
    COUNTRY: 'MW', // Malawi
    CURRENCY: 'MWK', // Malawi Kwacha
    API_VERSION: 'v1',
  };
};

const getAuthToken = async (): Promise<string> => {
  try {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      return cachedToken;
    }

    const { AIRTEL_BASE_URL, CLIENT_ID, CLIENT_SECRET, GRANT_TYPE } = getConfig();

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Airtel Money API credentials not configured. Please set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env file');
    }

    const response = await axios.post(
      `${AIRTEL_BASE_URL}/auth/oauth2/token`,
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: GRANT_TYPE,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      }
    );

    const accessToken = response.data.access_token;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('No access token received from Airtel Money API');
    }
    
    cachedToken = accessToken;
    const expiresIn = response.data.expires_in || 3600;
    tokenExpiry = Date.now() + expiresIn * 1000;

    return accessToken;
  } catch (error: any) {
    console.error('Error getting Airtel auth token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Airtel Money');
  }
};

interface RequestToPayParams {
  phoneNumber: string;
  amount: number;
  externalId?: string;
  description?: string;
}

interface RequestToPayResponse {
  success: boolean;
  transactionId?: string;
  referenceId?: string;
  status?: string;
  message: string;
  rawResponse?: any;
  error?: string;
  statusCode?: number;
}

const requestToPay = async ({
  phoneNumber,
  amount,
  externalId,
  description,
}: RequestToPayParams): Promise<RequestToPayResponse> => {
  try {
    const { AIRTEL_BASE_URL, COUNTRY, CURRENCY } = getConfig();
    const accessToken = await getAuthToken();
    const referenceId = externalId || `AM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Clean phone number: remove +265 or 0 prefix for Malawi
    const cleanPhoneNumber = phoneNumber.replace(/^\+265/, '').replace(/^0/, '');

    if (!cleanPhoneNumber.match(/^[1-9]\d{8}$/)) {
      return {
        success: false,
        message: 'Invalid Malawi phone number format',
        error: 'Phone number must be 9 digits starting with 1-9',
      };
    }

    const requestBody = {
      reference: referenceId,
      subscriber: {
        country: COUNTRY,
        currency: CURRENCY,
        msisdn: cleanPhoneNumber,
      },
      transaction: {
        amount: parseFloat(amount.toString()).toFixed(2),
        country: COUNTRY,
        currency: CURRENCY,
        id: referenceId,
      },
    };

    if (description) {
      (requestBody as any).description = description;
    }

    console.log('Requesting Airtel Money payment');
    console.log('Phone:', cleanPhoneNumber);
    console.log('Amount:', amount, CURRENCY);
    console.log('Reference:', referenceId);

    const response = await axios.post(
      `${AIRTEL_BASE_URL}/merchant/v1/payments/`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
          'X-Country': COUNTRY,
          'X-Currency': CURRENCY,
        },
      }
    );

    console.log('Airtel Money payment request sent successfully');
    console.log('Status Code:', response.data.status?.code);
    console.log('Transaction ID:', response.data.data?.transaction?.id);

    return {
      success: response.data.status?.code === '200' || response.data.status?.success,
      transactionId: response.data.data?.transaction?.id || referenceId,
      referenceId: referenceId,
      status: response.data.status?.code,
      message: response.data.status?.message || 'Payment request sent successfully',
      rawResponse: response.data,
    };
  } catch (error: any) {
    console.error('Error requesting Airtel Money payment:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.status?.message || error.message || 'Failed to request payment',
      error: error.response?.data?.status?.message || error.message,
      statusCode: error.response?.status,
    };
  }
};

interface TransactionStatusResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  amount?: string;
  currency?: string;
  message?: string;
  airtelMoneyId?: string;
  error?: string;
}

const getTransactionStatus = async (transactionId: string): Promise<TransactionStatusResponse> => {
  try {
    const { AIRTEL_BASE_URL, COUNTRY, CURRENCY } = getConfig();
    const accessToken = await getAuthToken();

    const response = await axios.get(`${AIRTEL_BASE_URL}/standard/v1/payments/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: '*/*',
        'X-Country': COUNTRY,
        'X-Currency': CURRENCY,
      },
    });

    const statusData = response.data.data?.transaction;

    console.log('Airtel Money transaction status:', statusData?.status);

    return {
      success: true,
      transactionId: statusData?.id,
      status: statusData?.status,
      amount: statusData?.amount,
      currency: statusData?.currency,
      message: statusData?.message,
      airtelMoneyId: statusData?.airtel_money_id,
    };
  } catch (error: any) {
    console.error('Error getting Airtel Money transaction status:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.status?.message || error.message,
    };
  }
};

interface AccountBalanceResponse {
  success: boolean;
  balance?: string;
  currency?: string;
  error?: string;
}

const getAccountBalance = async (): Promise<AccountBalanceResponse> => {
  try {
    const { AIRTEL_BASE_URL } = getConfig();
    const accessToken = await getAuthToken();

    const response = await axios.get(`${AIRTEL_BASE_URL}/standard/v1/users/balance`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: '*/*',
      },
    });

    return {
      success: true,
      balance: response.data.data?.balance,
      currency: response.data.data?.currency,
    };
  } catch (error: any) {
    console.error('Error getting Airtel Money account balance:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.status?.message || error.message,
    };
  }
};

export { getAuthToken, requestToPay, getTransactionStatus, getAccountBalance };
