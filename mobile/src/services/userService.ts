import { api } from './api';

export interface UploadResponse {
  avatarUrl: string;
}

export async function uploadAvatar(userId: string, formData: FormData, _token?: string): Promise<UploadResponse> {
  try {
    const response = await api.patch(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Upload failed'),
    };
  }
}

export async function removeAvatar(userId: string, _token?: string): Promise<void> {
  try {
    await api.delete(`/users/${userId}/avatar`);
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Remove failed'),
    };
  }
}

export interface ProviderResponse {
  providerId: string;
  fullName: string;
  email: string;
  bio: string;
  rating: number;
  completedJobsCount: number;
  portfolio: string[];
  services: any[];
}

export interface PaginatedProviders {
  content: ProviderResponse[];
  pageable: any;
  last: boolean;
  totalElements: number;
  totalPages: number;
  first: boolean;
  size: number;
  number: number;
  sort: any;
  numberOfElements: number;
  empty: boolean;
}

export async function getProviders(
  categoryName?: string,
  minRating: number = 0.0,
  page: number = 0,
  size: number = 10,
  sort: string = 'rating'
): Promise<PaginatedProviders> {
  try {
    const response = await api.get(`/users/providers`, {
      params: {
        category: categoryName,
        minRating,
        page,
        size,
        sort
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to fetch providers'),
    };
  }
}

export async function getProviderProfile(providerId: string): Promise<ProviderResponse> {
  try {
    const response = await api.get(`/users/providers/${providerId}`);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to fetch provider profile'),
    };
  }
}
