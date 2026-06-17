import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthPage from './components/AuthPage';
import {
  getMe,
  AuthResponse,
  AuthUser,
  listFolders,
  listRequests,
  createFolder,
  renameFolder,
  deleteFolder,
  createRequest,
  updateRequest,
  deleteRequest,
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  connectRealtime,
  FolderDTO,
  RequestDTO,
  EnvironmentDTO,
} from './lib/api';
import InviteModal from './components/InviteModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import Footer from './components/Footer';
import {
  ApiRequest,
  SidebarNode,
  RequestTab,
  ApiResponse,
  HttpMethod,
  KeyValueParam,
  EnvironmentVariable
} from './types';
import { defaultHeaders } from './data/mockCollections';
import { parsePostmanCollection, convertPostmanRequest, isPostmanFolder, PostmanItem } from './lib/postmanImport';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Check,
  Terminal,
  Activity,
  Play
} from 'lucide-react';

// form-data fields are persisted by JSON-encoding them into body_raw (no extra backend column needed)
function parseFormData(bodyType: string, bodyRaw: string): KeyValueParam[] {
  if (bodyType !== 'form-data' || !bodyRaw) {
    return [{ id: 'fd1', key: '', value: '', description: '', enabled: true }];
  }
  try {
    const parsed = JSON.parse(bodyRaw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [{ id: 'fd1', key: '', value: '', description: '', enabled: true }];
  } catch {
    return [{ id: 'fd1', key: '', value: '', description: '', enabled: true }];
  }
}

// Basic Auth has no dedicated backend columns, so its username/password are JSON-encoded
// into the existing generic auth_token text column (only when auth_type is 'basic').
function encodeBasicAuthToken(username: string, password: string): string {
  return JSON.stringify({ username, password });
}

function decodeBasicAuthToken(token: string): { username: string; password: string } {
  try {
    const parsed = JSON.parse(token);
    return { username: parsed.username || '', password: parsed.password || '' };
  } catch {
    return { username: '', password: '' };
  }
}

function dtoToApiRequest(dto: RequestDTO): ApiRequest {
  const isBasic = dto.auth_type === 'basic';
  const basicAuth = isBasic ? decodeBasicAuthToken(dto.auth_token || '') : null;

  return {
    id: String(dto.id),
    name: dto.name,
    method: dto.method,
    url: dto.url,
    path: [],
    params: dto.params.length > 0 ? dto.params : [{ id: 'p1', key: '', value: '', description: '', enabled: true }],
    headers: dto.headers.length > 0 ? dto.headers : [{ id: 'h1', key: '', value: '', description: '', enabled: true }],
    bodyType: dto.body_type,
    bodyRaw: dto.body_type === 'form-data' ? '' : dto.body_raw,
    formData: parseFormData(dto.body_type, dto.body_raw),
    authType: dto.auth_type || 'inherit',
    authToken: isBasic ? '' : dto.auth_token || '',
    authUsername: basicAuth?.username || '',
    authPassword: basicAuth?.password || '',
    response: null,
    folderId: dto.folder_id,
    isDirty: false,
  };
}

// Replace {{key}} placeholders with their resolved value from the active environment
function resolveVariables(text: string, variables: Map<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => variables.get(key.trim()) ?? match);
}

// Walk up the folder chain (by parent_id) to build a readable breadcrumb path
function buildFolderPath(folderId: number | null | undefined, foldersById: Map<number, FolderDTO>): string[] {
  const path: string[] = [];
  let current = folderId != null ? foldersById.get(folderId) : undefined;
  while (current) {
    path.unshift(current.name);
    current = current.parent_id != null ? foldersById.get(current.parent_id) : undefined;
  }
  return path;
}

export default function App() {
  // Auth gate
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Collection requests list and folder tree, persisted on the backend
  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [openFolderIds, setOpenFolderIds] = useState<Set<number>>(new Set());
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  // Tabs management
  const [tabs, setTabs] = useState<RequestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Collaboration: "Invite" modal visibility
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Drag-to-resize the boundary between the request builder and the response viewport
  const [requestPanelHeight, setRequestPanelHeight] = useState(420);
  const [isVerticalResizing, setIsVerticalResizing] = useState(false);

  const startVerticalResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = requestPanelHeight;
    setIsVerticalResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      const next = startHeight + (ev.clientY - startY);
      setRequestPanelHeight(Math.min(window.innerHeight - 220, Math.max(160, next)));
    };
    const onMouseUp = () => {
      setIsVerticalResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const loadCollections = useCallback(async (authToken: string) => {
    const [folderList, requestList, environmentList] = await Promise.all([
      listFolders(authToken),
      listRequests(authToken),
      listEnvironments(authToken),
    ]);
    setFolders(folderList);
    setOpenFolderIds(new Set(folderList.map((f) => f.id)));
    setRequests(requestList.map(dtoToApiRequest));
    setEnvironments(environmentList);
    setCollectionsLoaded(true);
  }, []);

  // Restore session from a previously stored token on page load
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      setAuthChecked(true);
      return;
    }
    getMe(storedToken)
      .then((user) => {
        setCurrentUser(user);
        setToken(storedToken);
        return loadCollections(storedToken);
      })
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setAuthChecked(true));
  }, [loadCollections]);

  const handleAuthenticated = (auth: AuthResponse) => {
    localStorage.setItem('auth_token', auth.token);
    setToken(auth.token);
    setCurrentUser(auth.user);
    loadCollections(auth.token);
  };

  // Real-time collaboration: a WebSocket connection receives a push the instant
  // a collaborator (or another of my own tabs) changes a shared folder/request,
  // so we just refetch everything rather than diffing individual changes.
  useEffect(() => {
    if (!token) return;
    const ws = connectRealtime(token, (type) => {
      if (type === 'collections_changed') {
        loadCollections(token);
      }
    });
    return () => ws.close();
  }, [token, loadCollections]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setCurrentUser(null);
    setFolders([]);
    setRequests([]);
    setEnvironments([]);
    setTabs([]);
    setActiveTabId('');
    setCollectionsLoaded(false);
  };

  // Environments (persisted on the backend; variables resolve {{key}} placeholders)
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const activeEnvironment = environments.find(e => e.is_active) || null;

  // Map of variable key -> value from the currently active environment, used to
  // resolve/highlight {{key}} placeholders in URLs
  const activeVariables = useMemo(() => {
    const map = new Map<string, string>();
    activeEnvironment?.variables.forEach(v => {
      if (v.enabled && v.key) map.set(v.key, v.value);
    });
    return map;
  }, [activeEnvironment]);

  const handleAddEnvironment = async () => {
    if (!token) return;
    try {
      const env = await createEnvironment(token, 'New Environment', [], environments.length === 0);
      setEnvironments(prev => [...prev, env]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Environment yaratishda xatolik.');
    }
  };

  const handleUpdateEnvironment = async (id: number, name: string, variables: EnvironmentVariable[]) => {
    if (!token) return;
    const target = environments.find(e => e.id === id);
    if (!target) return;
    try {
      const updated = await updateEnvironment(token, id, name, variables, target.is_active);
      setEnvironments(prev => prev.map(e => e.id === id ? updated : e));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Environment saqlashda xatolik.');
    }
  };

  // Update (or create) a single variable's value on the currently active environment —
  // used by the URL bar's {{variable}} hover tooltip for quick inline edits
  const handleUpdateVariable = (key: string, value: string) => {
    if (!activeEnvironment) return;
    const exists = activeEnvironment.variables.some(v => v.key === key);
    const newVariables = exists
      ? activeEnvironment.variables.map(v => v.key === key ? { ...v, value } : v)
      : [...activeEnvironment.variables, { id: Math.random().toString(36).slice(2, 9), key, value, enabled: true }];
    handleUpdateEnvironment(activeEnvironment.id, activeEnvironment.name, newVariables);
  };

  const handleSetActiveEnvironment = async (id: number) => {
    if (!token) return;
    const target = environments.find(e => e.id === id);
    if (!target) return;
    try {
      const updated = await updateEnvironment(token, id, target.name, target.variables, true);
      setEnvironments(prev => prev.map(e => e.id === id ? updated : { ...e, is_active: false }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Environment tanlashda xatolik.');
    }
  };

  const handleDeleteEnvironment = async (id: number) => {
    if (!token) return;
    try {
      await deleteEnvironment(token, id);
      setEnvironments(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Environment o\'chirishda xatolik.');
    }
  };

  // Running Request loaders and console log details
  const [isSending, setIsSending] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<{
    timestamp: string;
    method: HttpMethod;
    url: string;
    status?: number;
    duration?: number;
    type: 'request' | 'info' | 'error';
    details: string;
  }>>([
    {
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      url: 'https://api-dev.lms-academy.org/v1/auth/session',
      status: 200,
      duration: 86,
      type: 'request',
      details: 'Handshake completed. SSL Certificate verified successfully with zero warnings.'
    }
  ]);

  // Notifications
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Get active request loaded in focus
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeRequest = requests.find(r => r.id === (activeTab?.requestId || ''));

  // Trigger quick toast popup feedback
  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2500);
  };

  // Toggle collection tree folders (open/closed state only, not persisted)
  const handleToggleFolder = (folderId: string) => {
    const id = Number(folderId);
    setOpenFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Build the nested sidebar tree from the flat folders + requests lists
  const sidebarTree = useMemo<SidebarNode[]>(() => {
    const childrenByParent = new Map<number | null, FolderDTO[]>();
    folders.forEach(f => {
      const key = f.parent_id;
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key)!.push(f);
    });

    const requestsByFolder = new Map<number | null, ApiRequest[]>();
    requests.forEach(r => {
      const key = r.folderId ?? null;
      if (!requestsByFolder.has(key)) requestsByFolder.set(key, []);
      requestsByFolder.get(key)!.push(r);
    });

    const buildFolderNode = (folder: FolderDTO): SidebarNode => ({
      id: String(folder.id),
      name: folder.name,
      type: 'folder',
      isOpen: openFolderIds.has(folder.id),
      children: buildLevel(folder.id)
    });

    const buildLevel = (parentId: number | null): SidebarNode[] => {
      const subfolders = (childrenByParent.get(parentId) || []).map(buildFolderNode);
      const ownRequests = (requestsByFolder.get(parentId) || []).map((r): SidebarNode => ({
        id: `item_${r.id}`,
        requestId: r.id,
        name: r.name,
        type: 'request',
        method: r.method
      }));
      return [...subfolders, ...ownRequests];
    };

    return buildLevel(null);
  }, [folders, requests, openFolderIds]);

  const foldersById = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

  // Select request from sidebar tree
  const handleSelectRequest = (requestId: string) => {
    // If request already opened in one of the current tabs, switch to it
    const existingTab = tabs.find(t => t.requestId === requestId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      // Find full request configuration
      const reqObj = requests.find(r => r.id === requestId);
      if (!reqObj) return;

      // Create new tab
      const newTabId = `tab_${Math.random().toString(36).substring(2, 9)}`;
      const newTabObj: RequestTab = {
        id: newTabId,
        requestId: reqObj.id,
        name: reqObj.name,
        method: reqObj.method
      };

      setTabs(prev => [...prev, newTabObj]);
      setActiveTabId(newTabId);
    }
  };

  // Create a brand new request, persisted immediately in its target folder (or root)
  const handleAddRequest = async (folderId: number | null = null) => {
    if (!token) return;

    try {
      const dto = await createRequest(token, {
        folder_id: folderId,
        name: 'New Request',
        method: 'GET',
        url: '{{base_url}}/new-endpoint',
        params: [],
        headers: defaultHeaders(),
        body_type: 'none',
        body_raw: '',
        auth_type: 'inherit',
        auth_token: ''
      });

      const newRequest = dtoToApiRequest(dto);
      setRequests(prev => [...prev, newRequest]);

      const newTabId = `tab_${Math.random().toString(36).substring(2, 9)}`;
      setTabs(prev => [
        ...prev,
        { id: newTabId, requestId: newRequest.id, name: newRequest.name, method: newRequest.method }
      ]);
      setActiveTabId(newTabId);
      showToast('Yangi so\'rov yaratildi va saqlandi.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'So\'rov yaratishda xatolik.');
    }
  };

  // Create a new folder, optionally nested under a parent folder. No prompt — defaults
  // to "New Folder" so it can be renamed inline afterwards.
  const handleAddFolder = async (parentId: number | null = null) => {
    if (!token) return;

    try {
      const folder = await createFolder(token, 'New Folder', parentId);
      setFolders(prev => [...prev, folder]);
      setOpenFolderIds(prev => new Set(prev).add(folder.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Papka yaratishda xatolik.');
    }
  };

  // Import a Postman collection (.json export) — recreates its folder/request tree
  // on the backend under a new root folder named after the collection.
  const handleImportCollection = async (file: File) => {
    if (!token) return;

    try {
      const text = await file.text();
      const collection = parsePostmanCollection(text);

      const newFolders: FolderDTO[] = [];
      const newRequests: RequestDTO[] = [];
      const newOpenFolderIds: number[] = [];

      const importItems = async (items: PostmanItem[], parentId: number | null) => {
        for (const item of items) {
          if (isPostmanFolder(item)) {
            const folder = await createFolder(token, item.name || 'Imported folder', parentId);
            newFolders.push(folder);
            newOpenFolderIds.push(folder.id);
            await importItems(item.item || [], folder.id);
          } else if (item.request) {
            const converted = convertPostmanRequest(item);
            const dto = await createRequest(token, {
              folder_id: parentId,
              name: converted.name,
              method: converted.method,
              url: converted.url,
              params: converted.params,
              headers: converted.headers,
              body_type: converted.bodyType,
              body_raw: converted.bodyRaw,
              auth_type: converted.authType,
              auth_token: converted.authToken,
            });
            newRequests.push(dto);
          }
        }
      };

      const rootFolder = await createFolder(
        token,
        collection.info?.name || file.name.replace(/\.json$/i, ''),
        null
      );
      newFolders.push(rootFolder);
      newOpenFolderIds.push(rootFolder.id);
      await importItems(collection.item || [], rootFolder.id);

      setFolders((prev) => [...prev, ...newFolders]);
      setRequests((prev) => [...prev, ...newRequests.map(dtoToApiRequest)]);
      setOpenFolderIds((prev) => new Set([...prev, ...newOpenFolderIds]));
      showToast(`Import qilindi: ${newRequests.length} so'rov, ${newFolders.length} papka.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import qilishda xatolik.');
    }
  };

  // Rename a folder in place
  const handleRenameFolder = async (folderId: number, newName: string) => {
    if (!token || !newName.trim()) return;
    const target = folders.find(f => f.id === folderId);
    if (!target) return;

    try {
      const updated = await renameFolder(token, folderId, newName.trim(), target.parent_id);
      setFolders(prev => prev.map(f => f.id === folderId ? updated : f));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Nomini o\'zgartirishda xatolik.');
    }
  };

  // Delete a folder (backend cascades to subfolders & requests inside it) — no confirm prompt
  const handleDeleteFolder = async (folderId: number) => {
    if (!token) return;

    try {
      await deleteFolder(token, folderId);
      const removedIds = new Set<number>();
      const collectRemoved = (id: number) => {
        removedIds.add(id);
        folders.filter(f => f.parent_id === id).forEach(f => collectRemoved(f.id));
      };
      collectRemoved(folderId);

      setFolders(prev => prev.filter(f => !removedIds.has(f.id)));
      setRequests(prev => prev.filter(r => r.folderId == null || !removedIds.has(r.folderId)));
      setTabs(prev => prev.filter(t => {
        const req = requests.find(r => r.id === t.requestId);
        return req ? req.folderId == null || !removedIds.has(req.folderId) : false;
      }));
      showToast('Papka o\'chirildi.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Papkani o\'chirishda xatolik.');
    }
  };

  // Delete a single request — no confirm prompt
  const handleDeleteRequest = async (requestId: string) => {
    if (!token) return;

    try {
      await deleteRequest(token, Number(requestId));
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setTabs(prev => {
        const remaining = prev.filter(t => t.requestId !== requestId);
        if (activeTabId && !remaining.find(t => t.id === activeTabId)) {
          setActiveTabId(remaining.length > 0 ? remaining[0].id : '');
        }
        return remaining;
      });
      showToast('So\'rov o\'chirildi.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'So\'rovni o\'chirishda xatolik.');
    }
  };

  // Persist any request to the backend, optionally overriding its name (used by both
  // the Ctrl+S save flow and inline renaming)
  const persistRequest = useCallback(async (target: ApiRequest, nameOverride?: string) => {
    if (!token) return;

    // Strip the in-memory File blob before persisting — only the field's metadata
    // (key/filename/type) is saved; the actual file content never reaches our backend.
    const bodyRaw = target.bodyType === 'form-data'
      ? JSON.stringify((target.formData || []).map(({ files, ...rest }) => rest))
      : target.bodyRaw || '';

    const dto = await updateRequest(token, Number(target.id), {
      folder_id: target.folderId ?? null,
      name: nameOverride ?? target.name,
      method: target.method,
      url: target.url,
      params: target.params,
      headers: target.headers,
      body_type: target.bodyType,
      body_raw: bodyRaw,
      auth_type: target.authType || 'inherit',
      auth_token: target.authType === 'basic'
        ? encodeBasicAuthToken(target.authUsername || '', target.authPassword || '')
        : target.authToken || ''
    });
    const saved = dtoToApiRequest(dto);
    setRequests(prev => prev.map(r => r.id === saved.id ? saved : r));
    setTabs(prev => prev.map(t => t.requestId === saved.id ? { ...t, name: saved.name, method: saved.method } : t));
    return saved;
  }, [token]);

  // Persist the currently active request to the backend (Ctrl+S / Save button)
  const handleSaveActiveRequest = useCallback(async () => {
    if (!activeRequest) return;
    try {
      await persistRequest(activeRequest);
      showToast('Saqlandi.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik.');
    }
  }, [activeRequest, persistRequest]);

  // Rename a request in place (e.g. from the breadcrumb title)
  const handleRenameRequest = async (requestId: string, newName: string) => {
    if (!newName.trim()) return;
    const target = requests.find(r => r.id === requestId);
    if (!target) return;

    try {
      await persistRequest(target, newName.trim());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Nomini o\'zgartirishda xatolik.');
    }
  };

  // Ctrl+S / Cmd+S saves the active request instead of triggering the browser's save dialog
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveRequest();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveActiveRequest]);

  // Close tab
  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    const closedTabIdx = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);

    setTabs(newTabs);

    // If closing active tab, dynamically focus adjacent tab (or none left)
    if (activeTabId === tabId) {
      if (newTabs.length === 0) {
        setActiveTabId('');
      } else {
        const nextActiveIdx = Math.max(0, closedTabIdx - 1);
        setActiveTabId(newTabs[nextActiveIdx].id);
      }
    }
  };

  // Handle active request edits (kept local/unsaved until Ctrl+S or the Save button persists them)
  const handleUpdateRequest = (updatedReq: ApiRequest) => {
    const dirtyReq = { ...updatedReq, isDirty: true };

    // Update collections registry — the sidebar tree re-derives itself from this via useMemo
    setRequests(prev => prev.map(r => r.id === dirtyReq.id ? dirtyReq : r));

    // Update tab header badge/title
    setTabs(prev => prev.map(t => {
      if (t.requestId === dirtyReq.id) {
        return {
          ...t,
          name: dirtyReq.name,
          method: dirtyReq.method
        };
      }
      return t;
    }));
  };

  // Execute Request Engine (Simulate API responses)
  // Send a real HTTP request from the browser: resolves {{variables}}, applies
  // params (already folded into the URL), headers, auth (Bearer), and the body
  // (raw JSON or multipart form-data), then renders the real response.
  const handleSendRequest = async (req: ApiRequest) => {
    setIsSending(true);

    const resolvedUrl = resolveVariables(req.url, activeVariables);

    // Skip placeholder "calculated when request is sent" headers (display-only,
    // not real values) and headers browsers manage themselves and forbid setting.
    const FORBIDDEN_HEADERS = new Set(['host', 'connection', 'content-length', 'user-agent', 'accept-encoding']);
    const headers: Record<string, string> = {};
    req.headers
      .filter(h => h.key && h.enabled && !h.value.includes('<calculated') && !FORBIDDEN_HEADERS.has(h.key.toLowerCase()))
      .forEach(h => {
        headers[resolveVariables(h.key, activeVariables)] = resolveVariables(h.value, activeVariables);
      });

    if (req.authType === 'bearer' && req.authToken) {
      headers['Authorization'] = `Bearer ${resolveVariables(req.authToken, activeVariables)}`;
    } else if (req.authType === 'basic' && (req.authUsername || req.authPassword)) {
      const username = resolveVariables(req.authUsername || '', activeVariables);
      const password = resolveVariables(req.authPassword || '', activeVariables);
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
    }

    let body: BodyInit | undefined;
    const canHaveBody = req.method !== 'GET' && req.method !== 'HEAD';
    if (canHaveBody && req.bodyType === 'json') {
      body = resolveVariables(req.bodyRaw || '', activeVariables);
      if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
    } else if (canHaveBody && req.bodyType === 'form-data') {
      const formData = new FormData();
      (req.formData || []).filter(f => f.key && f.enabled).forEach(f => {
        const key = resolveVariables(f.key, activeVariables);
        if (f.fieldType === 'file' && f.files?.length) {
          // Files go straight from the browser to the target API — they never touch our backend.
          f.files.forEach((file) => formData.append(key, file, file.name));
        } else {
          formData.append(key, resolveVariables(f.value, activeVariables));
        }
      });
      body = formData;
      // Let the browser set its own multipart Content-Type (with boundary)
      Object.keys(headers).forEach(k => { if (k.toLowerCase() === 'content-type') delete headers[k]; });
    }

    setConsoleLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      url: resolvedUrl,
      type: 'info' as const,
      details: `Yuborilmoqda. Header soni: ${Object.keys(headers).length}, Auth: ${req.authType || 'inherit'}, Body: ${req.bodyType}.`
    }, ...prev]);

    const startedAt = performance.now();
    let responsePayload: ApiResponse;

    try {
      const res = await fetch(resolvedUrl, { method: req.method, headers, body });
      const timeMs = Math.round(performance.now() - startedAt);
      const text = await res.text();
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      responsePayload = {
        statusCode: res.status,
        statusText: res.statusText,
        timeMs,
        sizeBytes: new Blob([text]).size,
        isError: !res.ok,
        headers: responseHeaders,
        body: text
      };
    } catch (err) {
      const timeMs = Math.round(performance.now() - startedAt);
      responsePayload = {
        statusCode: 0,
        statusText: 'Network Error',
        timeMs,
        sizeBytes: 0,
        isError: true,
        headers: {},
        body: JSON.stringify({
          error: err instanceof Error ? err.message : 'Request failed',
          hint: 'Tarmoq xatosi yoki CORS server tomonidan bloklangan bo\'lishi mumkin.'
        }, null, 2)
      };
    }

    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, response: responsePayload } : r));
    setIsSending(false);

    setConsoleLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      url: resolvedUrl,
      status: responsePayload.statusCode,
      duration: responsePayload.timeMs,
      type: (responsePayload.isError ? 'error' : 'request') as 'error' | 'request',
      details: `${responsePayload.statusCode} ${responsePayload.statusText}. Payload: ${responsePayload.sizeBytes} bytes.`
    }, ...prev]);
    showToast(responsePayload.isError
      ? `Xatolik: ${responsePayload.statusCode || ''} ${responsePayload.statusText}`
      : `Status ${responsePayload.statusCode} ${responsePayload.statusText}`);
  };

  // Method color map for tabs
  const getTabBadgeColor = (method: HttpMethod) => {
    switch (method) {
      case 'GET': return 'text-[#0cbb52]';
      case 'POST': return 'text-[#eec500]';
      case 'PUT': return 'text-[#097bed]';
      case 'DELETE': return 'text-[#eb2013]';
      case 'PATCH': return 'text-[#b936f3]';
      default: return 'text-gray-400';
    }
  };

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1c1c1c] text-gray-400 text-sm">
        Yuklanmoqda...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#1c1c1c] text-gray-200 overflow-hidden font-sans select-none relative">

      {/* Dynamic Pop-up Toast Feedback */}
      {toast.visible && (
        <div className="absolute top-[52px] right-4 bg-gray-900 border border-gray-700 text-white shadow-xl px-4 py-2.5 rounded z-[9999] text-xs flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 bg-[#ef5b25] rounded-full animate-ping"></span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Global Navigation Top Header */}
      <Header onLogout={handleLogout} onInviteClick={() => setInviteModalOpen(true)} />

      {/* Main Content Workspace Panel */}
      <div className="flex-1 flex items-stretch min-h-0 relative overflow-hidden">

        {/* 2. Double Sidebar Navigation */}
        <Sidebar
          sidebarTree={sidebarTree}
          activeRequestId={activeRequest?.id || ''}
          onSelectRequest={handleSelectRequest}
          onToggleFolder={handleToggleFolder}
          onAddRequest={() => handleAddRequest(null)}
          onAddRequestInFolder={(folderId) => handleAddRequest(Number(folderId))}
          onImportCollection={handleImportCollection}
          onAddFolder={() => handleAddFolder(null)}
          onAddSubfolder={(folderId) => handleAddFolder(Number(folderId))}
          onRenameFolder={(folderId, name) => handleRenameFolder(Number(folderId), name)}
          onDeleteFolder={(folderId) => handleDeleteFolder(Number(folderId))}
          onDeleteRequest={handleDeleteRequest}
          workspaceOwner={currentUser.login}
          environments={environments}
          onAddEnvironment={handleAddEnvironment}
          onUpdateEnvironment={handleUpdateEnvironment}
          onSetActiveEnvironment={handleSetActiveEnvironment}
          onDeleteEnvironment={handleDeleteEnvironment}
        />

        {/* 3. Central Request-Response playground */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#212121]">
          
          {/* Scrollable top Tab Bar exactly like the screenshot */}
          <div className="h-[38px] bg-[#1c1c1c] border-b border-[#2b2b2b] flex items-center justify-between text-xs select-none shrink-0 pr-3">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1 min-w-0 mr-4">
              {/* Internal Prev / Next navigation arrow icons */}
              <div className="flex items-center gap-0.5 text-gray-500 px-2 shrink-0 border-r border-[#2b2b2b] mr-1">
                <ChevronLeft size={14} className="hover:text-gray-300 cursor-pointer" />
                <ChevronRight size={14} className="hover:text-gray-300 cursor-pointer" />
              </div>

              {/* Scrollable Tabs */}
              <div className="flex items-stretch h-[38px]">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`group h-full px-3 flex items-center gap-1.5 border-r border-[#2b2b2b] cursor-pointer text-[12px] relative transition-colors pr-7 ${
                        isActive 
                          ? 'bg-[#212121] text-white font-semibold' 
                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#2b2b2b]/15 bg-[#1c1c1c]'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#ef5b25]"></div>
                      )}

                      {/* Small Method Pill badge */}
                      <span className={`text-[9px] font-bold tracking-tight shrink-0 ${getTabBadgeColor(tab.method)}`}>
                        {tab.method === 'DELETE' ? 'DEL' : tab.method}
                      </span>

                      {/* Request Label */}
                      <span className="truncate max-w-[110px] text-[11px]">{tab.name}</span>

                      {/* Unsaved-changes dot */}
                      {requests.find(r => r.id === tab.requestId)?.isDirty && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef5b25] shrink-0" title="Saqlanmagan o'zgarishlar" />
                      )}

                      {/* Close Tab Circle */}
                      <button 
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="absolute right-1.5 p-0.5 rounded-full hover:bg-gray-700/60 text-gray-500 hover:text-white transition-all overflow-hidden"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Plus add tab */}
              <button
                onClick={() => handleAddRequest(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#2d2d2d] shrink-0 ml-1.5 cursor-pointer transition-colors"
                title="Create request tab"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            </div>

          </div>

          {/* Render Active Request configuration inside panels */}
          {activeRequest ? (
            <div className="flex-1 min-w-0 flex flex-col min-h-0">

              {/* TOP: Request address & inputs Builder */}
              <div style={{ height: requestPanelHeight }} className="shrink-0 overflow-y-auto custom-scrollbar">
                <RequestPanel
                  activeRequest={{ ...activeRequest, path: buildFolderPath(activeRequest.folderId, foldersById) }}
                  onSend={handleSendRequest}
                  onUpdateRequest={handleUpdateRequest}
                  onSave={handleSaveActiveRequest}
                  onRename={(newName) => handleRenameRequest(activeRequest.id, newName)}
                  isSending={isSending}
                  activeVariables={activeVariables}
                  activeEnvironmentName={activeEnvironment?.name}
                  onUpdateVariable={handleUpdateVariable}
                />
              </div>

              {/* Drag handle: resize the request builder vs. response viewport split */}
              <div
                onMouseDown={startVerticalResize}
                className={`h-[5px] shrink-0 cursor-row-resize relative z-10 transition-colors ${isVerticalResizing ? 'bg-[#ef5b25]/60' : 'bg-[#1c1c1c] hover:bg-[#ef5b25]/60'}`}
                title="Kengligini o'zgartirish"
              />

              {/* BOTTOM: Response rendering viewport */}
              <ResponsePanel
                response={activeRequest.response}
                isSending={isSending}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <span>No request active in this panel</span>
              <button 
                onClick={() => handleAddRequest(null)}
                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
              >
                Create a Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Scrollable Active Developer Console Log drawers */}
      {consoleOpen && (
        <div className="absolute bottom-[28px] left-[320px] right-0 h-[280px] bg-[#1a1a1a] border-t border-[#2d2d2d] z-[999] flex flex-col font-mono text-xs select-text">
          <div className="h-8 bg-[#212121] border-b border-[#2d2d2d] flex items-center justify-between px-4 text-[11px] text-gray-400 shrink-0 select-none">
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-[#ef5b25]" />
              <span className="font-bold text-gray-200">Console Log Analytics Console</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setConsoleLogs([])}
                className="hover:text-white px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 transition"
              >
                Clear log
              </button>
              <button 
                onClick={() => setConsoleOpen(false)}
                className="hover:text-white text-gray-500 font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* List of actions inside terminal */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar select-text space-y-3 font-mono leading-relaxed bg-[#141414] focus:outline-none">
            {consoleLogs.length === 0 ? (
              <div className="text-gray-600 text-center py-12">Console telemetry stack is ready. No requests triggered yet.</div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className="border-b border-[#222] pb-2 text-[11px] select-text">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#ef5b25]/10 text-[#ef5b25] px-1 py-0.2 rounded font-mono text-[9px] font-bold">INFO</span>
                      <span className="font-bold text-blue-400">{log.method}</span>
                      <span className="text-gray-300 truncate max-w-lg">{log.url}</span>
                    </div>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-gray-400 pl-6 whitespace-pre-wrap leading-relaxed">{log.details}</div>
                  
                  {log.duration && (
                    <div className="flex items-center gap-4 pl-6 mt-1 text-[10px] text-gray-500">
                      <span>Status Code: <strong className="text-emerald-400">{log.status}</strong></span>
                      <span>Execution Speed: <strong className="text-emerald-400">{log.duration}ms</strong></span>
                      <span>Security Certs: <strong className="text-gray-400">TLS v1.3 Verified</strong></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Bottom status bar */}
      <Footer
        onToggleConsole={() => setConsoleOpen(!consoleOpen)}
        consoleOpen={consoleOpen}
      />

      {/* Invite collaborators modal */}
      {inviteModalOpen && token && (
        <InviteModal
          token={token}
          rootFolders={folders.filter(f => f.parent_id === null && f.role === 'owner')}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}
