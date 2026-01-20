const API_BASE = '/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...options.headers,
  };

  // 只有在有 body 时才设置 Content-Type 为 application/json
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw error;
  }

  return response.json();
}

// 项目相关 API
export const projectApi = {
  list: () => apiRequest<Project[]>('/projects'),
  create: (data: { name: string; authToken: string }) =>
    apiRequest<{ data: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; authToken?: string }) =>
    apiRequest<{ data: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
  get: (id: number) =>
    apiRequest<{ data: Project }>(`/projects/${id}`),
};

// 关注人相关 API
export const followingApi = {
  list: (projectId: number) =>
    apiRequest<{ data: FollowingUser[] }>(`/projects/${projectId}/following`),
  add: (projectId: number, data: { profileUrl: string }) =>
    apiRequest<{ data: FollowingUser }>(`/projects/${projectId}/following`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (projectId: number, id: number, data: { isFollowing?: boolean }) =>
    apiRequest<{ data: FollowingUser }>(`/projects/${projectId}/following/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (projectId: number, id: number) =>
    apiRequest<{ success: boolean }>(`/projects/${projectId}/following/${id}`, {
      method: 'DELETE',
    }),
  followAll: (projectId: number) =>
    apiRequest<{
      data: {
        total: number;
        success: number;
        failed: number;
        results: Array<{ screenName: string; status: string; error?: string }>;
      };
    }>(`/projects/${projectId}/following/follow-all`, {
      method: 'POST',
    }),
  sync: (projectId: number, cursor?: string) =>
    apiRequest<{
      data: {
        added: number;
        updated: number;
        skipped: number;
        nextCursor?: string;
        error?: string;
      };
    }>(`/projects/${projectId}/following/sync`, {
      method: 'POST',
      body: cursor ? JSON.stringify({ cursor }) : undefined,
    }),
};

// 推文相关 API
export const tweetsApi = {
  list: (projectId: number, params?: { date?: string; page?: number; limit?: number; hasImages?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.hasImages !== undefined) query.set('hasImages', params.hasImages.toString());

    return apiRequest<{
      data: Tweet[];
      pagination: Pagination;
    }>(`/projects/${projectId}/tweets?${query.toString()}`);
  },
  fetch: (projectId: number) =>
    apiRequest<{
      data: { success: boolean; count: number; error?: string };
    }>(`/projects/${projectId}/tweets/fetch`, {
      method: 'POST',
    }),
  dates: (projectId: number) =>
    apiRequest<{ data: string[] }>(`/projects/${projectId}/tweets/dates`),
  fetchLogs: (projectId: number, limit?: number) =>
    apiRequest<{ data: FetchLog[] }>(
      `/projects/${projectId}/fetch-logs?limit=${limit || 50}`
    ),
};

// 重新导出类型
import type {
  Project,
  FollowingUser,
  Tweet,
  FetchLog,
  Pagination,
} from '../types';
