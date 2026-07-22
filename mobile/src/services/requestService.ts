import { api } from './api';

export interface CreateRequestResponse {
  id: string;
  requesterId: string;
  status: string;
  createdAt: string;
}

export async function createRequest(formData: FormData, token: string): Promise<CreateRequestResponse> {
  try {
    const response = await api.post(`/requests`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    const isNetwork = !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
    const status = error.response?.status || (isNetwork ? 0 : 500);
    const data = error.response?.data;
    let message = 'Failed to post request';
    let errorCode = 'UNKNOWN';

    if (typeof data === 'string') {
      message = data;
    } else if (data) {
      message = data.message || data.error || message;
      errorCode = data.error || errorCode;
    } else if (error.message) {
      message = error.message;
    }

    throw {
      status,
      error: errorCode,
      message,
      isNetworkError: isNetwork,
    };
  }
}

export interface GetMyRequestsResponse {
  requests: any[];
  counts: {
    active: number;
    completed: number;
    cancelled: number;
  };
  hasMore: boolean;
  nextPage: number | null;
}

export async function getMyRequests(
  statusGroup: string,
  page: number,
  token: string
): Promise<GetMyRequestsResponse> {
  try {
    const response = await api.get(`/requests/mine`, {
      params: {
        status: statusGroup,
        page,
        limit: 15,
      },
      // Authorization header is handled automatically by api interceptor
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to fetch requests'),
    };
  }
}

export async function cancelRequest(requestId: string, token: string): Promise<{ status: string }> {
  try {
    const response = await api.patch(`/requests/${requestId}/cancel`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to cancel request'),
    };
  }
}

export async function acceptCounterOffer(requestId: string, token: string): Promise<{ status: string; finalBudget: number }> {
  try {
    const response = await api.patch(`/requests/${requestId}/counter-offer/accept`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to accept offer'),
    };
  }
}

export async function declineCounterOffer(requestId: string, token: string): Promise<{ status: string }> {
  try {
    const response = await api.patch(`/requests/${requestId}/counter-offer/decline`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to decline offer'),
    };
  }
}
