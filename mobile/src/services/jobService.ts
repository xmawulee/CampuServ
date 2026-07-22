import { api } from './api';

export interface JobSummary {
  active: JobBucket;
  inProgress: JobBucket;
  completed: JobBucket;
  disputed: JobBucket;
}

export interface JobBucket {
  count: number;
  jobs: any[]; // Replace with proper Job type if available
}

export interface PaginatedJobs {
  content: any[];
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

export async function getProviderJobSummary(providerId: string): Promise<JobSummary> {
  try {
    const response = await api.get(`/jobs/provider/${providerId}/summary`);
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to fetch job summary'),
    };
  }
}

export async function getProviderJobs(providerId: string, status: string, page: number, size: number = 10): Promise<PaginatedJobs> {
  try {
    const response = await api.get(`/jobs/provider/${providerId}`, {
      params: {
        status,
        page,
        size,
      },
    });
    return response.data;
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.message || error.message || 'Failed to fetch jobs'),
    };
  }
}
