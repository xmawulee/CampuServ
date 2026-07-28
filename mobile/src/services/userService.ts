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
  id?: string;
  providerId?: string;
  fullName: string;
  email: string;
  bio?: string;
  rating: number;
  completedJobsCount: number;
  portfolio: string[];
  services: any[];
  serviceCategory?: string;
  whatsappNumber?: string;
  viewCount?: number;
  keyServices?: string[];
  approvedAt?: string;
  createdAt?: string;
  isSaved?: boolean;
  heroImageUrl?: string;
  priceOrQuote?: string;
  basePrice?: number;
  location?: string;
  availabilityStatus?: string;
  profilePictureUrl?: string;
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
  sort: string = 'rating',
  searchQuery?: string,
  verifiedOnly?: boolean,
  minPrice?: number,
  maxPrice?: number,
  categories?: string[]
): Promise<PaginatedProviders> {
  try {
    const response = await api.get(`/users/providers`, {
      params: {
        category: categoryName,
        minRating,
        page,
        size,
        sort,
        name: searchQuery,
        verified: verifiedOnly,
        minPrice,
        maxPrice,
        categories: categories ? categories.join(',') : undefined
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

export async function toggleSaveListing(providerId: string): Promise<{ saved: boolean; message: string }> {
  try {
    const response = await api.post(`/users/providers/${providerId}/save`);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to toggle save'),
    };
  }
}

export async function reportListing(providerId: string, reason: string, details?: string): Promise<{ message: string }> {
  try {
    const response = await api.post(`/users/providers/${providerId}/report`, { reason, details });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to report listing'),
    };
  }
}

export async function getProviderListings(providerId: string): Promise<{ provider: ProviderResponse; services: any[] }> {
  try {
    const response = await api.get(`/users/providers/${providerId}/listings`);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to fetch provider listings'),
    };
  }
}

export async function uploadPortfolioPhoto(userId: string, formData: FormData): Promise<{ url: string; portfolio: string[] }> {
  try {
    const response = await api.post(`/users/${userId}/portfolio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Upload photo failed'),
    };
  }
}

export async function deletePortfolioPhoto(userId: string, url: string): Promise<{ success: boolean; portfolio: string[] }> {
  try {
    const response = await api.delete(`/users/${userId}/portfolio`, {
      params: { url },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Delete photo failed'),
    };
  }
}

export async function updateProviderService(
  providerId: string,
  serviceId: string,
  data: { basePrice?: number; categoryId?: string }
): Promise<any> {
  try {
    const response = await api.put(`/users/providers/${providerId}/services/${serviceId}`, data);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to update service listing'),
    };
  }
}

export async function deleteProviderService(providerId: string, serviceId: string): Promise<any> {
  try {
    const response = await api.delete(`/users/providers/${providerId}/services/${serviceId}`);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to delete service listing'),
    };
  }
}

