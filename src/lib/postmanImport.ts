import { AuthType, HttpMethod, KeyValueParam } from '../types';

interface PostmanKeyValue {
  key: string;
  value?: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanUrl {
  raw?: string;
  query?: PostmanKeyValue[];
}

interface PostmanBody {
  mode?: 'raw' | 'formdata' | 'urlencoded';
  raw?: string;
  formdata?: PostmanKeyValue[];
  urlencoded?: PostmanKeyValue[];
  options?: { raw?: { language?: string } };
}

interface PostmanAuth {
  type?: string;
  bearer?: { token?: string } | PostmanKeyValue[];
}

interface PostmanRequest {
  method?: string;
  header?: PostmanKeyValue[];
  body?: PostmanBody;
  url?: PostmanUrl | string;
  auth?: PostmanAuth;
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

export interface PostmanCollection {
  info?: { name?: string; schema?: string };
  item?: PostmanItem[];
}

export interface ConvertedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  bodyType: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
  bodyRaw: string;
  authType: AuthType;
  authToken: string;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function toKeyValueParams(list?: PostmanKeyValue[]): KeyValueParam[] {
  if (!list || list.length === 0) return [];
  return list.map((p) => ({
    id: genId(),
    key: p.key || '',
    value: p.value || '',
    description: p.description || '',
    enabled: !p.disabled,
  }));
}

function extractBearerToken(auth: PostmanAuth): string {
  const bearer = auth.bearer;
  if (!bearer) return '';
  if (Array.isArray(bearer)) {
    return bearer.find((b) => b.key === 'token')?.value || '';
  }
  return bearer.token || '';
}

export function isPostmanFolder(item: PostmanItem): boolean {
  return Array.isArray(item.item);
}

export function convertPostmanRequest(item: PostmanItem): ConvertedRequest {
  const req = item.request || {};
  const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';
  const params = typeof req.url === 'object' ? toKeyValueParams(req.url?.query) : [];
  const headers = toKeyValueParams(req.header);

  let bodyType: ConvertedRequest['bodyType'] = 'none';
  let bodyRaw = '';
  const body = req.body;
  if (body?.mode === 'raw') {
    bodyType = body.options?.raw?.language === 'json' ? 'json' : 'raw';
    bodyRaw = body.raw || '';
  } else if (body?.mode === 'formdata') {
    bodyType = 'form-data';
    bodyRaw = JSON.stringify(toKeyValueParams(body.formdata));
  } else if (body?.mode === 'urlencoded') {
    bodyType = 'form-data';
    bodyRaw = JSON.stringify(toKeyValueParams(body.urlencoded));
  }

  let authType: AuthType = 'none';
  let authToken = '';
  if (req.auth?.type === 'bearer') {
    authType = 'bearer';
    authToken = extractBearerToken(req.auth);
  }

  return {
    name: item.name || 'Imported request',
    method: (req.method || 'GET').toUpperCase() as HttpMethod,
    url,
    params,
    headers,
    bodyType,
    bodyRaw,
    authType,
    authToken,
  };
}

export function parsePostmanCollection(rawText: string): PostmanCollection {
  const data = JSON.parse(rawText);
  if (!data || !Array.isArray(data.item)) {
    throw new Error("Bu fayl to'g'ri Postman collection formatida emas.");
  }
  return data as PostmanCollection;
}
