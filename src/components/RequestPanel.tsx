import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { HttpMethod, KeyValueParam, ApiRequest, AuthType } from '../types';

interface RequestPanelProps {
  activeRequest: ApiRequest;
  onSend: (request: ApiRequest) => void;
  onUpdateRequest: (updated: ApiRequest) => void;
  onSave?: () => void;
  onRename?: (newName: string) => void;
  isSending: boolean;
  activeVariables?: Map<string, string>;
  activeEnvironmentName?: string;
  onUpdateVariable?: (key: string, value: string) => void;
}

// Map HTTP methods to specific colored styles matching Postman Dark exactly
const METHOD_STYLES = {
  GET: { text: 'text-[#0cbb52]', bg: 'bg-[#0cbb52]/10', border: 'border-[#0cbb52]/40', pill: 'text-[#0cbb52]' },
  POST: { text: 'text-[#ffb400]', bg: 'bg-[#ffb400]/10', border: 'border-[#ffb400]/40', pill: 'text-[#ffb400]' },
  PUT: { text: 'text-[#097bed]', bg: 'bg-[#097bed]/10', border: 'border-[#097bed]/40', pill: 'text-[#097bed]' },
  DELETE: { text: 'text-[#eb2013]', bg: 'bg-[#eb2013]/10', border: 'border-[#eb2013]/40', pill: 'text-[#eb2013]' },
  PATCH: { text: 'text-[#b936f3]', bg: 'bg-[#b936f3]/10', border: 'border-[#b936f3]/40', pill: 'text-[#b936f3]' },
  OPTIONS: { text: 'text-[#a6a6a6]', bg: 'bg-[#a6a6a6]/10', border: 'border-[#a6a6a6]/40', pill: 'text-[#a6a6a6]' },
  HEAD: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', pill: 'text-indigo-400' }
};

const genId = () => Math.random().toString(36).substring(2, 9);
const emptyRow = (): KeyValueParam => ({ id: genId(), key: '', value: '', description: '', enabled: true });

function splitBaseAndQuery(url: string): [string, string] {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return [url, ''];
  return [url.slice(0, qIndex), url.slice(qIndex + 1)];
}

function parseQueryToParams(query: string): KeyValueParam[] {
  if (!query) return [emptyRow()];
  const parts = query.split('&').filter(Boolean);
  if (parts.length === 0) return [emptyRow()];
  const params = parts.map((p) => {
    const [k, v = ''] = p.split('=');
    return { id: genId(), key: decodeURIComponent(k || ''), value: decodeURIComponent(v || ''), description: '', enabled: true };
  });
  params.push(emptyRow());
  return params;
}

function buildUrlWithParams(baseUrl: string, params: KeyValueParam[]): string {
  const active = params.filter((p) => p.key && p.enabled);
  if (active.length === 0) return baseUrl;
  const query = active.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
  return `${baseUrl}?${query}`;
}

export default function RequestPanel({
  activeRequest,
  onSend,
  onUpdateRequest,
  onSave,
  onRename,
  isSending,
  activeVariables,
  activeEnvironmentName,
  onUpdateVariable
}: RequestPanelProps) {
  const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body'>('headers');
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(activeRequest.url);
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [isRenamingName, setIsRenamingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeRequest.name);
  const [hoveredVar, setHoveredVar] = useState<{ key: string; x: number; y: number } | null>(null);
  const [tooltipValueDraft, setTooltipValueDraft] = useState('');
  const hideTooltipTimeout = useRef<number | null>(null);

  const showVariableTooltip = (key: string, x: number, y: number) => {
    if (hideTooltipTimeout.current) {
      window.clearTimeout(hideTooltipTimeout.current);
      hideTooltipTimeout.current = null;
    }
    setTooltipValueDraft(activeVariables?.get(key) ?? '');
    setHoveredVar({ key, x, y });
  };

  const scheduleHideTooltip = () => {
    hideTooltipTimeout.current = window.setTimeout(() => setHoveredVar(null), 200);
  };

  const cancelHideTooltip = () => {
    if (hideTooltipTimeout.current) {
      window.clearTimeout(hideTooltipTimeout.current);
      hideTooltipTimeout.current = null;
    }
  };

  // Sync draft URL with parent updates when switching active files
  useEffect(() => {
    setUrlDraft(activeRequest.url);
  }, [activeRequest.id, activeRequest.url]);

  // Sync draft name when switching active files
  useEffect(() => {
    setNameDraft(activeRequest.name);
    setIsRenamingName(false);
  }, [activeRequest.id, activeRequest.name]);

  const commitRename = () => {
    setIsRenamingName(false);
    if (nameDraft.trim() && nameDraft.trim() !== activeRequest.name) {
      onRename?.(nameDraft.trim());
    } else {
      setNameDraft(activeRequest.name);
    }
  };

  const handleMethodChange = (m: HttpMethod) => {
    onUpdateRequest({
      ...activeRequest,
      method: m
    });
    setMethodDropdownOpen(false);
  };

  // Typing in the URL bar re-derives the Params grid from its query string
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlDraft(val);
    const [, query] = splitBaseAndQuery(val);
    onUpdateRequest({
      ...activeRequest,
      url: val,
      params: parseQueryToParams(query)
    });
  };

  // Handle generic changes in Key-Value editor grids (params / headers / form-data)
  const updateGridItem = (
    type: 'params' | 'headers' | 'formData',
    index: number,
    field: keyof KeyValueParam,
    value: any
  ) => {
    const originalList = type === 'params' ? activeRequest.params : type === 'headers' ? activeRequest.headers : (activeRequest.formData || []);
    const newList = [...originalList];

    newList[index] = {
      ...newList[index],
      [field]: value
    };

    // If typing in the last blank item, append a new empty item automatically
    const lastItem = newList[newList.length - 1];
    if (lastItem && (lastItem.key || lastItem.value || lastItem.description)) {
      newList.push(emptyRow());
    }

    if (type === 'params') {
      const [base] = splitBaseAndQuery(urlDraft);
      const newUrl = buildUrlWithParams(base, newList);
      setUrlDraft(newUrl);
      onUpdateRequest({ ...activeRequest, params: newList, url: newUrl });
    } else if (type === 'headers') {
      onUpdateRequest({ ...activeRequest, headers: newList });
    } else {
      onUpdateRequest({ ...activeRequest, formData: newList });
    }
  };

  const deleteGridItem = (type: 'params' | 'headers' | 'formData', index: number) => {
    const originalList = type === 'params' ? activeRequest.params : type === 'headers' ? activeRequest.headers : (activeRequest.formData || []);
    if (originalList.length <= 1) return; // Keep at least one blank

    const newList = originalList.filter((_, i) => i !== index);

    if (type === 'params') {
      const [base] = splitBaseAndQuery(urlDraft);
      const newUrl = buildUrlWithParams(base, newList);
      setUrlDraft(newUrl);
      onUpdateRequest({ ...activeRequest, params: newList, url: newUrl });
    } else if (type === 'headers') {
      onUpdateRequest({ ...activeRequest, headers: newList });
    } else {
      onUpdateRequest({ ...activeRequest, formData: newList });
    }
  };

  const currentList = activeTab === 'params' ? activeRequest.params : activeRequest.headers;
  // Ensure we always have at least one blank item
  useEffect(() => {
    if (activeRequest.params.length === 0) {
      onUpdateRequest({ ...activeRequest, params: [emptyRow()] });
    }
    if (activeRequest.headers.length === 0) {
      onUpdateRequest({ ...activeRequest, headers: [emptyRow()] });
    }
  }, [activeRequest.id]);

  // Render the URL bar's text with {{variable}} placeholders colored blue (resolved)
  // or red (missing from the active environment), with a hover tooltip.
  const renderHighlightedUrl = () => {
    const parts = urlDraft.split(/(\{\{[^}]+\}\})/g);
    return (
      <div className="absolute inset-0 pl-3.5 pr-10 flex items-center font-mono text-[13px] whitespace-pre overflow-hidden pointer-events-none">
        {parts.map((part, index) => {
          if (part.startsWith('{{') && part.endsWith('}}')) {
            const key = part.slice(2, -2).trim();
            const resolved = activeVariables?.get(key);
            const isKnown = resolved !== undefined;
            return (
              <span
                key={index}
                onMouseEnter={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  showVariableTooltip(key, rect.left, rect.bottom);
                }}
                onMouseLeave={scheduleHideTooltip}
                className={`font-bold px-0.5 rounded pointer-events-auto cursor-help ${
                  isKnown
                    ? 'text-[#a6d1ff] bg-[#14325a]/40 border border-[#23589b]/40'
                    : 'text-[#ff8a8a] bg-[#3a1414]/50 border border-[#7a2424]/50'
                }`}
              >
                {part}
              </span>
            );
          }
          return <span key={index} className="text-gray-100">{part}</span>;
        })}
      </div>
    );
  };

  const authTypeLabels: Record<AuthType, string> = {
    inherit: 'Inherit auth from parent',
    none: 'No Auth',
    bearer: 'Bearer Token'
  };

  return (
    <div className="flex flex-col bg-[#212121] select-none font-sans border-b border-[#2b2b2b]">

      {/* 1. Address breadcrumbs and Actions bar */}
      <div className="h-[43px] px-4 flex items-center justify-between border-b border-[#2b2b2b]/60 text-xs">
        {/* Breadcrumb links */}
        <div className="flex items-center gap-1.5 text-gray-400 font-medium overflow-hidden pr-4">
          <span className="text-[10px] bg-[#2a685e] text-[#aefbe3] font-bold px-1 rounded-sm shrink-0">HTTP</span>
          {activeRequest.path.map((segment, idx) => (
            <React.Fragment key={idx}>
              <span className="truncate hover:text-white cursor-pointer">{segment}</span>
              <span className="text-gray-600">/</span>
            </React.Fragment>
          ))}
          {isRenamingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setNameDraft(activeRequest.name); setIsRenamingName(false); }
              }}
              className="bg-[#1c1c1c] border border-[#ef5b25]/60 rounded px-1.5 py-0.5 text-gray-100 font-semibold text-xs outline-none w-40"
            />
          ) : (
            <span
              onDoubleClick={() => setIsRenamingName(true)}
              className="text-gray-200 font-semibold truncate cursor-text"
              title="Nomini o'zgartirish uchun ikki marta bosing"
            >
              {activeRequest.name}
            </span>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 h-[26px] px-2.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3e3e3e] hover:text-white text-gray-300 rounded transition-colors cursor-pointer text-[11px]"
            title="Ctrl+S"
          >
            <Save size={12} className="text-gray-400" />
            <span>Save</span>
            {activeRequest.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef5b25]" title="Saqlanmagan o'zgarishlar" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Address Bar Group with selector and Send */}
      <div className="p-4 pb-2 flex items-stretch gap-2.5">

        {/* Method drop down selector */}
        <div className="relative shrink-0 flex">
          <button
            onClick={() => setMethodDropdownOpen(!methodDropdownOpen)}
            className={`flex items-center justify-between gap-2 h-9 px-3 bg-[#2d2d2d] hover:bg-[#333333] border border-[#3e3e3e] rounded font-bold text-xs cursor-pointer ${METHOD_STYLES[activeRequest.method].text}`}
          >
            <span className="w-12 text-left">{activeRequest.method}</span>
            <ChevronDown size={11} className="text-gray-500 shrink-0" />
          </button>

          {methodDropdownOpen && (
            <div className="absolute top-10 left-0 w-32 bg-[#2d2d2d] border border-[#3e3e3e] rounded shadow-lg z-[100] py-1 text-left font-mono">
              {(Object.keys(METHOD_STYLES) as HttpMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMethodChange(m)}
                  className={`w-full px-3 py-1.5 text-xs hover:bg-[#383838] text-left font-medium block cursor-pointer ${METHOD_STYLES[m].text}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input area: colored {{variable}} overlay only shown while not editing,
            so selecting/typing text never visually doubles up with the overlay. */}
        <div className="flex-1 relative bg-[#2d2d2d] border border-[#3e3e3e] rounded flex items-center overflow-hidden">
          {!isUrlFocused && renderHighlightedUrl()}
          <input
            type="text"
            value={urlDraft}
            onChange={handleUrlChange}
            onFocus={() => setIsUrlFocused(true)}
            onBlur={() => setIsUrlFocused(false)}
            className={`w-full h-full bg-transparent border-none outline-none font-mono text-[13px] pl-3.5 pr-10 focus:ring-0 selection:bg-blue-600/30 selection:text-white placeholder-gray-500 ${
              isUrlFocused ? 'text-gray-100' : 'text-transparent caret-gray-100'
            }`}
            placeholder="Enter URL or paste text"
          />

          {hoveredVar && (
            <div
              onMouseEnter={cancelHideTooltip}
              onMouseLeave={scheduleHideTooltip}
              className="fixed z-[200] bg-[#2d2d2d] border border-[#3e3e3e] rounded shadow-2xl text-[11px] py-2 px-3 w-60"
              style={{ top: hoveredVar.y + 4, left: hoveredVar.x }}
            >
              <div className="text-gray-500 font-semibold mb-1.5">
                {activeEnvironmentName || 'Collection'}
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="font-mono shrink-0">{hoveredVar.key}</span>
                <input
                  value={tooltipValueDraft}
                  onChange={(e) => setTooltipValueDraft(e.target.value)}
                  onBlur={() => onUpdateVariable?.(hoveredVar.key, tooltipValueDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onUpdateVariable?.(hoveredVar.key, tooltipValueDraft);
                  }}
                  placeholder="aniqlanmagan"
                  className={`flex-1 bg-[#1c1c1c] border rounded px-1.5 py-0.5 outline-none font-mono text-[11px] ${
                    activeVariables?.has(hoveredVar.key)
                      ? 'text-[#a6d1ff] border-[#3e3e3e] focus:border-[#097bed]/60'
                      : 'text-[#ff8a8a] border-[#7a2424]/60 focus:border-[#ef5b25]/60'
                  }`}
                />
              </div>
              <div className="text-gray-600 mt-1.5 text-[10px]">Variables in request →</div>
            </div>
          )}
        </div>

        {/* Send split button */}
        <div className="flex shrink-0">
          <button
            onClick={() => onSend(activeRequest)}
            disabled={isSending}
            className={`h-9 px-5 bg-[#097bed] hover:bg-blue-600 text-white font-bold text-xs rounded-l flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors disabled:opacity-50 disabled:cursor-wait`}
          >
            {isSending ? (
              <span className="w-10 text-center">Sending</span>
            ) : (
              <>
                <span>Send</span>
              </>
            )}
          </button>

          <button className="h-9 px-2 bg-[#097bed] hover:bg-blue-600 text-white border-l border-blue-600/40 rounded-r flex items-center justify-center cursor-pointer">
            <ChevronDown size={12} className="text-white" />
          </button>
        </div>
      </div>

      {/* 3. Sub-tabs row */}
      <div className="flex items-center justify-between border-b border-[#2b2b2b]/80 px-4 text-xs">
        <div className="flex items-center gap-5">
          <button
            onClick={() => setActiveTab('params')}
            className={`py-2.5 relative font-medium transition-all ${
              activeTab === 'params'
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Params</span>
            {activeRequest.params.filter(p => p.key && p.enabled).length > 0 && (
              <span className="ml-1.5 text-[9px] bg-emerald-500/20 text-[#0cbb52] px-1 py-0.2 rounded-full">
                {activeRequest.params.filter(p => p.key && p.enabled).length}
              </span>
            )}
            {activeTab === 'params' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auth')}
            className={`py-2.5 relative font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'auth'
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Authorization</span>
            {activeRequest.authType !== 'none' && (
              <span className="w-1.5 h-1.5 bg-[#0cbb52] rounded-full inline-block" title={authTypeLabels[activeRequest.authType || 'inherit']}></span>
            )}
            {activeTab === 'auth' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('headers')}
            className={`py-2.5 relative font-medium transition-all ${
              activeTab === 'headers'
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Headers</span>
            {activeRequest.headers.filter(h => h.key && h.enabled).length > 0 && (
              <span className="ml-1 text-[11px] text-gray-500">
                ({activeRequest.headers.filter(h => h.key && h.enabled).length})
              </span>
            )}
            {activeTab === 'headers' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('body')}
            className={`py-2.5 relative font-medium transition-all ${
              activeTab === 'body'
                ? 'text-white font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>Body</span>
            {activeRequest.bodyType !== 'none' && (
              <span className="ml-1 w-1.5 h-1.5 bg-[#ef5b25] rounded-full inline-block"></span>
            )}
            {activeTab === 'body' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
            )}
          </button>

        </div>
      </div>

      {/* 4. Active tab details component */}
      <div className="relative min-h-[160px] bg-[#212121]">

        {/* PARAMS / HEADERS GRID */}
        {(activeTab === 'headers' || activeTab === 'params') && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-gray-300 font-mono">
              <thead>
                <tr className="border-b border-[#2b2b2b] text-[11px] text-gray-400 uppercase select-none tracking-wider bg-[#1f1f1f]/30">
                  <th className="w-10 px-3 py-2 text-center text-gray-500">Enable</th>
                  <th className="w-1/3 border-r border-[#2b2b2b]/60 px-3 py-2">Key</th>
                  <th className="w-1/3 border-r border-[#2b2b2b]/60 px-3 py-2">Value</th>
                  <th className="border-r border-[#2b2b2b]/60 px-3 py-2">Description</th>
                  <th className="w-10 px-2 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b2b2b]/50">
                {currentList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-[#2b2b2b]/30 group transition-colors">
                    {/* Checkbox */}
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateGridItem(activeTab, index, 'enabled', e.target.checked)}
                        className="accent-[#ef5b25] scale-[1.05] rounded border-[#3e3e3e] bg-[#2a2a2a] cursor-pointer"
                      />
                    </td>

                    {/* Key Input */}
                    <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                      <input
                        type="text"
                        value={item.key}
                        onChange={(e) => updateGridItem(activeTab, index, 'key', e.target.value)}
                        placeholder="Key"
                        className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-200 placeholder-gray-600 font-mono text-[11.5px]"
                      />
                    </td>

                    {/* Value Input */}
                    <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => updateGridItem(activeTab, index, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-200 placeholder-gray-600 font-mono text-[11.5px]"
                      />
                    </td>

                    {/* Description Input */}
                    <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                      <div className="flex items-center justify-between w-full">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateGridItem(activeTab, index, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-400 placeholder-gray-600 font-mono text-[11px]"
                        />
                      </div>
                    </td>

                    {/* Trash Action */}
                    <td className="px-2 text-center">
                      <button
                        onClick={() => deleteGridItem(activeTab, index)}
                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all cursor-pointer"
                        title="Delete parameter"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AUTHORIZATION TAB */}
        {activeTab === 'auth' && (
          <div className="p-5 text-gray-300 text-xs flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-400 shrink-0">Auth Type:</span>
              <div className="relative">
                <button
                  onClick={() => setAuthDropdownOpen(!authDropdownOpen)}
                  className="bg-[#2d2d2d] px-2.5 py-1 rounded text-gray-200 border border-[#3e3e3e] flex items-center gap-2 cursor-pointer hover:bg-[#333333]"
                >
                  <span>{authTypeLabels[activeRequest.authType || 'inherit']}</span>
                  <ChevronDown size={11} className="text-gray-500" />
                </button>
                {authDropdownOpen && (
                  <div className="absolute top-8 left-0 w-44 bg-[#2d2d2d] border border-[#3e3e3e] rounded shadow-lg z-[100] py-1">
                    {(Object.keys(authTypeLabels) as AuthType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          onUpdateRequest({ ...activeRequest, authType: t });
                          setAuthDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs hover:bg-[#383838] text-left text-gray-200 block cursor-pointer"
                      >
                        {authTypeLabels[t]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {activeRequest.authType === 'bearer' && (
              <div className="flex items-center gap-3 max-w-lg">
                <span className="font-semibold text-gray-400 shrink-0 w-12">Token</span>
                <input
                  type="text"
                  value={activeRequest.authToken || ''}
                  onChange={(e) => onUpdateRequest({ ...activeRequest, authToken: e.target.value })}
                  placeholder="{{token}}"
                  className="flex-1 bg-[#2d2d2d] border border-[#3e3e3e] rounded px-2.5 py-1.5 outline-none text-gray-200 font-mono text-xs focus:border-[#ef5b25]/60"
                />
              </div>
            )}

            {activeRequest.authType === 'inherit' && (
              <p className="text-gray-500 leading-relaxed max-w-xl">
                This request is inheriting authorization from the parent collection.
              </p>
            )}

            {activeRequest.authType === 'none' && (
              <p className="text-gray-500 leading-relaxed max-w-xl">
                This request does not use any authorization.
              </p>
            )}
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === 'body' && (
          <div className="p-4 flex flex-col h-full gap-3 text-xs">
            <div className="flex items-center gap-4 text-gray-400 border-b border-[#2b2b2b] pb-2 text-[11px]">
              <span className="font-medium text-gray-100">Body Mode:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="bodytype"
                  checked={activeRequest.bodyType === 'none'}
                  onChange={() => onUpdateRequest({ ...activeRequest, bodyType: 'none' })}
                  className="accent-[#ef5b25]"
                />
                <span>none</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="bodytype"
                  checked={activeRequest.bodyType === 'json'}
                  onChange={() => onUpdateRequest({ ...activeRequest, bodyType: 'json' })}
                  className="accent-[#ef5b25]"
                />
                <span>raw (JSON)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="bodytype"
                  checked={activeRequest.bodyType === 'form-data'}
                  onChange={() => onUpdateRequest({
                    ...activeRequest,
                    bodyType: 'form-data',
                    formData: activeRequest.formData?.length ? activeRequest.formData : [emptyRow()]
                  })}
                  className="accent-[#ef5b25]"
                />
                <span>form-data</span>
              </label>
            </div>

            {activeRequest.bodyType === 'json' && (
              <textarea
                value={activeRequest.bodyRaw || '{\n  \n}'}
                onChange={(e) => onUpdateRequest({ ...activeRequest, bodyRaw: e.target.value })}
                className="w-full h-32 bg-[#1c1c1c] text-green-400 p-3 font-mono text-xs rounded border border-[#3e3e3e] focus:outline-none focus:border-gray-500 select-text"
              />
            )}

            {activeRequest.bodyType === 'form-data' && (
              <div className="overflow-x-auto w-full border border-[#2b2b2b] rounded">
                <table className="w-full text-left text-xs text-gray-300 font-mono">
                  <thead>
                    <tr className="border-b border-[#2b2b2b] text-[11px] text-gray-400 uppercase select-none tracking-wider bg-[#1f1f1f]/30">
                      <th className="w-10 px-3 py-2 text-center text-gray-500">Enable</th>
                      <th className="w-1/3 border-r border-[#2b2b2b]/60 px-3 py-2">Key</th>
                      <th className="w-1/3 border-r border-[#2b2b2b]/60 px-3 py-2">Value</th>
                      <th className="border-r border-[#2b2b2b]/60 px-3 py-2">Description</th>
                      <th className="w-10 px-2 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b]/50">
                    {(activeRequest.formData || [emptyRow()]).map((item, index) => (
                      <tr key={item.id} className="hover:bg-[#2b2b2b]/30 group transition-colors">
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => updateGridItem('formData', index, 'enabled', e.target.checked)}
                            className="accent-[#ef5b25] scale-[1.05] rounded border-[#3e3e3e] bg-[#2a2a2a] cursor-pointer"
                          />
                        </td>
                        <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                          <input
                            type="text"
                            value={item.key}
                            onChange={(e) => updateGridItem('formData', index, 'key', e.target.value)}
                            placeholder="Key"
                            className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-200 placeholder-gray-600 font-mono text-[11.5px]"
                          />
                        </td>
                        <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => updateGridItem('formData', index, 'value', e.target.value)}
                            placeholder="Value"
                            className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-200 placeholder-gray-600 font-mono text-[11.5px]"
                          />
                        </td>
                        <td className="border-r border-[#2b2b2b]/60 px-1 py-1">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateGridItem('formData', index, 'description', e.target.value)}
                            placeholder="Description"
                            className="w-full bg-transparent px-2 py-0.5 outline-none text-gray-400 placeholder-gray-600 font-mono text-[11px]"
                          />
                        </td>
                        <td className="px-2 text-center">
                          <button
                            onClick={() => deleteGridItem('formData', index)}
                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all cursor-pointer"
                            title="Delete field"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeRequest.bodyType === 'none' && (
              <div className="py-6 text-center text-gray-500">
                This request does not send an explicit payload. Choose raw (JSON) or form-data above to write payloads.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
