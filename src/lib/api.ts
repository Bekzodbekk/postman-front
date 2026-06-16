import { AuthType, EnvironmentVariable, HttpMethod, KeyValueParam } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8089';

export interface AuthUser {
  id: number;
  login: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type FolderRole = 'owner' | 'developer' | 'viewer';

export interface FolderDTO {
  id: number;
  user_id: number;
  parent_id: number | null;
  root_folder_id: number | null;
  name: string;
  position: number;
  role: FolderRole;
}

export interface CollaboratorDTO {
  user_id: number;
  login: string;
  email: string;
  role: FolderRole;
}

export interface RequestDTO {
  id: number;
  folder_id: number | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  body_type: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
  body_raw: string;
  auth_type: AuthType;
  auth_token: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentDTO {
  id: number;
  name: string;
  variables: EnvironmentVariable[];
  is_active: boolean;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export function signUp(email: string, login: string, password: string) {
  return request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, login, password }),
  });
}

export function signIn(login: string, password: string) {
  return request<AuthResponse>('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export function getMe(token: string) {
  return request<AuthUser>('/api/me', {
    headers: authHeaders(token),
  });
}

export function listFolders(token: string) {
  return request<FolderDTO[]>('/api/folders', { headers: authHeaders(token) });
}

export function createFolder(token: string, name: string, parentId: number | null) {
  return request<FolderDTO>('/api/folders', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, parent_id: parentId }),
  });
}

export function renameFolder(token: string, id: number, name: string, parentId: number | null) {
  return request<FolderDTO>(`/api/folders/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, parent_id: parentId }),
  });
}

export function deleteFolder(token: string, id: number) {
  return request<{ success: boolean }>(`/api/folders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function listRequests(token: string) {
  return request<RequestDTO[]>('/api/requests', { headers: authHeaders(token) });
}

export interface RequestSavePayload {
  folder_id: number | null;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  body_type: string;
  body_raw: string;
  auth_type: AuthType;
  auth_token: string;
}

export function createRequest(token: string, payload: RequestSavePayload) {
  return request<RequestDTO>('/api/requests', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateRequest(token: string, id: number, payload: RequestSavePayload) {
  return request<RequestDTO>(`/api/requests/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteRequest(token: string, id: number) {
  return request<{ success: boolean }>(`/api/requests/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function listEnvironments(token: string) {
  return request<EnvironmentDTO[]>('/api/environments', { headers: authHeaders(token) });
}

export function createEnvironment(token: string, name: string, variables: EnvironmentVariable[], isActive: boolean) {
  return request<EnvironmentDTO>('/api/environments', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, variables, is_active: isActive }),
  });
}

export function updateEnvironment(token: string, id: number, name: string, variables: EnvironmentVariable[], isActive: boolean) {
  return request<EnvironmentDTO>(`/api/environments/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ name, variables, is_active: isActive }),
  });
}

export function deleteEnvironment(token: string, id: number) {
  return request<{ success: boolean }>(`/api/environments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function inviteToFolder(token: string, folderId: number, email: string, role: 'developer' | 'viewer') {
  return request<CollaboratorDTO>(`/api/folders/${folderId}/share`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ email, role }),
  });
}

export function listCollaborators(token: string, folderId: number) {
  return request<CollaboratorDTO[]>(`/api/folders/${folderId}/share`, { headers: authHeaders(token) });
}

export function removeCollaborator(token: string, folderId: number, userId: number) {
  return request<{ success: boolean }>(`/api/folders/${folderId}/share/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function connectRealtime(token: string, onEvent: (type: string) => void): WebSocket {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/api/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data?.type) onEvent(data.type);
    } catch {
      // ignore malformed messages
    }
  };
  return ws;
}
