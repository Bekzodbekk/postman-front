export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface KeyValueParam {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

export interface ApiResponse {
  statusCode: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  body: string;
  headers: Record<string, string>;
  isError: boolean;
}

export type AuthType = 'inherit' | 'none' | 'bearer';

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  description?: string;
  path: string[]; // e.g. ["LMS", "Teacher", "Assignments"]
  params: KeyValueParam[];
  headers: KeyValueParam[];
  bodyType: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
  bodyRaw?: string;
  formData?: KeyValueParam[];
  authType?: AuthType;
  authToken?: string;
  response?: ApiResponse | null;
  folderId?: number | null; // backend folder this request lives in (null = root level)
  isDirty?: boolean; // unsaved local edits not yet persisted to backend
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: number;
  name: string;
  variables: EnvironmentVariable[];
  isActive: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  children: (FolderNode | RequestNode)[];
  isOpen?: boolean;
}

export interface RequestNode {
  id: string;
  name: string;
  type: 'request';
  method: HttpMethod;
  requestId: string; // references the actual ApiRequest object
}

export type SidebarNode = FolderNode | RequestNode;

export interface RequestTab {
  id: string;
  requestId: string;
  name: string;
  method: HttpMethod;
  isDirty?: boolean;
}
