import React, { useState, useEffect } from 'react';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Layers,
  Globe,
  FileText,
  FilePlus,
  FolderPlus,
  Trash2
} from 'lucide-react';
import { SidebarNode, HttpMethod, EnvironmentVariable } from '../types';
import { EnvironmentDTO } from '../lib/api';
import EnvironmentsPanel from './EnvironmentsPanel';

interface SidebarProps {
  sidebarTree: SidebarNode[];
  activeRequestId: string;
  onSelectRequest: (requestId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onAddRequest?: () => void;
  onAddRequestInFolder?: (folderId: string) => void;
  onAddFolder?: () => void;
  onAddSubfolder?: (folderId: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onDeleteRequest?: (requestId: string) => void;
  workspaceOwner?: string;
  environments?: EnvironmentDTO[];
  onAddEnvironment?: () => void;
  onUpdateEnvironment?: (id: number, name: string, variables: EnvironmentVariable[]) => void;
  onSetActiveEnvironment?: (id: number) => void;
  onDeleteEnvironment?: (id: number) => void;
}

// Left side slim utilities strip data
const UTILITY_ITEMS = [
  { id: 'collections', label: 'Collections', icon: Layers, active: true },
  { id: 'environments', label: 'Environments', icon: Globe },
];

export default function Sidebar({
  sidebarTree,
  activeRequestId,
  onSelectRequest,
  onToggleFolder,
  onAddRequest,
  onAddRequestInFolder,
  onAddFolder,
  onAddSubfolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteRequest,
  workspaceOwner = 'Bekzodbekk',
  environments = [],
  onAddEnvironment,
  onUpdateEnvironment,
  onSetActiveEnvironment,
  onDeleteEnvironment
}: SidebarProps) {
  const [activeUtil, setActiveUtil] = useState('collections');
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Drag-to-resize the whole sidebar (utility strip + panel together)
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setIsResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      const next = startWidth + (ev.clientX - startX);
      setWidth(Math.min(640, Math.max(240, next)));
    };
    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const startRenamingFolder = (folderId: string, currentName: string) => {
    setRenamingFolderId(folderId);
    setRenameDraft(currentName);
  };

  const commitRenameFolder = () => {
    if (renamingFolderId && renameDraft.trim()) {
      onRenameFolder?.(renamingFolderId, renameDraft.trim());
    }
    setRenamingFolderId(null);
  };
  const [contextMenu, setContextMenu] = useState<
    | { type: 'root'; x: number; y: number }
    | { type: 'folder'; x: number; y: number; folderId: string }
    | { type: 'request'; x: number; y: number; requestId: string }
    | null
  >(null);

  // Close the context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  const openRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'root', x: e.clientX, y: e.clientY });
  };

  const openFolderContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'folder', x: e.clientX, y: e.clientY, folderId });
  };

  const openRequestContextMenu = (e: React.MouseEvent, requestId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'request', x: e.clientX, y: e.clientY, requestId });
  };

  // Get color for HttpMethod badges matching Postman exactly
  const getMethodBadgeColor = (method: HttpMethod) => {
    switch (method) {
      case 'GET':
        return 'text-[#0cbb52]'; // postman green
      case 'POST':
        return 'text-[#eec500]'; // postman orange-yellow
      case 'PUT':
        return 'text-[#097bed]'; // postman blue
      case 'DELETE':
        return 'text-[#eb2013]'; // postman red
      case 'PATCH':
        return 'text-[#b936f3]'; // postman purple
      default:
        return 'text-gray-400';
    }
  };

  const getMethodShortText = (method: HttpMethod) => {
    if (method === 'DELETE') return 'DEL';
    return method;
  };

  // Filter tree nodes recursively based on search query
  const filterTree = (nodes: SidebarNode[]): SidebarNode[] => {
    if (!searchQuery) return nodes;
    
    return nodes.map(node => {
      if (node.type === 'request') {
        const matches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matches ? node : null;
      } else {
        const filteredChildren = filterTree(node.children);
        const selfMatches = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (selfMatches || filteredChildren.length > 0) {
          return {
            ...node,
            isOpen: selfMatches ? node.isOpen : true, // Auto-expand parent if child matches
            children: filteredChildren
          } as SidebarNode;
        }
        return null;
      }
    }).filter(Boolean) as SidebarNode[];
  };

  const filteredTree = filterTree(sidebarTree);

  // Look up a folder node's current name anywhere in the tree, by id
  const findFolderName = (nodes: SidebarNode[], folderId: string): string => {
    for (const node of nodes) {
      if (node.type === 'folder') {
        if (node.id === folderId) return node.name;
        const found = findFolderName(node.children, folderId);
        if (found) return found;
      }
    }
    return '';
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: SidebarNode, level: number = 0) => {
    const isFolder = node.type === 'folder';
    const isSelected = !isFolder && node.requestId === activeRequestId;
    const paddingLeft = `${level * 10 + 12}px`;

    if (isFolder) {
      return (
        <div key={node.id} className="w-full text-[12px]">
          {/* Folder row */}
          <div
            onClick={() => onToggleFolder(node.id)}
            onContextMenu={(e) => openFolderContextMenu(e, node.id)}
            style={{ paddingLeft }}
            className="group h-[30px] flex items-center justify-between hover:bg-[#2b2b2b]/60 text-gray-300 hover:text-white cursor-pointer select-none transition-all pr-2"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-gray-500 scale-90">
                {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <Folder size={13} className="text-[#a6a6a6] shrink-0" />
              {renamingFolderId === node.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitRenameFolder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRenameFolder();
                    if (e.key === 'Escape') setRenamingFolderId(null);
                  }}
                  className="bg-[#1c1c1c] border border-[#ef5b25]/60 rounded px-1 py-0.5 text-[12px] text-white outline-none w-32"
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); startRenamingFolder(node.id, node.name); }}
                  className="truncate py-0.5 font-medium"
                >
                  {node.name}
                </span>
              )}
            </div>

            {/* Hover actions: new subfolder, new request here, delete */}
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onAddSubfolder?.(node.id); }}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3a3a3a] rounded cursor-pointer"
                title="Yangi ichki papka"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddRequestInFolder?.(node.id); }}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3a3a3a] rounded cursor-pointer"
                title="Yangi so'rov"
              >
                <FilePlus size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteFolder?.(node.id); }}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-[#3a3a3a] rounded cursor-pointer"
                title="Papkani o'chirish"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Render children if folder is open */}
          {node.isOpen && node.children && node.children.length > 0 && (
            <div className="relative">
              {node.children.map(child => renderTreeNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // Request row
      return (
        <div
          key={node.id}
          onClick={() => onSelectRequest(node.requestId)}
          onContextMenu={(e) => openRequestContextMenu(e, node.requestId)}
          style={{ paddingLeft }}
          className={`h-[28px] flex items-center justify-between hover:bg-[#2b2b2b]/65 cursor-pointer text-[12px] group relative transition-all pr-2 ${
            isSelected
              ? 'bg-[#212121] text-white border-l-2 border-[#ef5b25] pl-[-2px]'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 w-full py-0.5 truncate">
            {/* Method tag */}
            <span className={`text-[9px] font-bold tracking-tight w-[28px] text-right shrink-0 ${getMethodBadgeColor(node.method)}`}>
              {getMethodShortText(node.method)}
            </span>
            {/* Name */}
            <span className={`truncate ${isSelected ? 'font-semibold text-white' : 'font-normal text-gray-300'}`}>
              {node.name}
            </span>
          </div>

          {/* Hover action: delete request */}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest?.(node.requestId); }}
            className="hidden group-hover:flex w-5 h-5 items-center justify-center text-gray-500 hover:text-red-400 hover:bg-[#3a3a3a] rounded cursor-pointer shrink-0"
            title="So'rovni o'chirish"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    }
  };

  return (
    <div style={{ width }} className="relative shrink-0 flex items-stretch h-full bg-[#1c1c1c] select-none font-sans">

      {/* Drag handle to resize the sidebar */}
      <div
        onMouseDown={startResize}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 hover:bg-[#ef5b25]/60 transition-colors ${isResizing ? 'bg-[#ef5b25]/60' : 'bg-transparent'}`}
        title="Kengligini o'zgartirish"
      />
      <div className="absolute top-0 right-0 w-px h-full bg-[#2b2b2b]" />

      {/* 1. Left Vertical UTILITY strip */}
      <div className="w-[66px] shrink-0 border-r border-[#2b2b2b] flex flex-col items-center py-2 gap-1 bg-[#1c1c1c]">
        {UTILITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeUtil === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveUtil(item.id)}
              className={`w-[58px] h-[52px] rounded flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-[#2b2b2b]/80 border-r-2 border-r-[#ef5b25] text-white' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2b2b2b]/40'
              }`}
            >
              <Icon size={16} />
              <span className="text-[9px] font-medium leading-none tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Secondary collapsible workspace side panel */}
      <div className="flex-1 flex flex-col bg-[#1c1c1c]">
        {/* Workspace Identity and Header Action Pills */}
        <div className="p-3 pb-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 cursor-pointer hover:text-white">
                <span className="text-[13px] font-bold text-gray-200">{workspaceOwner}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-500">By {workspaceOwner}</span>
              </div>
            </div>

            {/* Header buttons */}
            <div className="flex items-center gap-1">
              <button className="h-[22px] px-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white font-medium text-[11px] rounded transition-colors cursor-pointer">
                Import
              </button>
            </div>
          </div>
        </div>

        {activeUtil === 'environments' ? (
          <EnvironmentsPanel
            environments={environments}
            onAddEnvironment={onAddEnvironment}
            onUpdateEnvironment={onUpdateEnvironment}
            onSetActiveEnvironment={onSetActiveEnvironment}
            onDeleteEnvironment={onDeleteEnvironment}
          />
        ) : (
          <>
            {/* Search Bar & Add operations inside search bar */}
            <div className="px-3 pb-2.5 flex items-center gap-2">
              {/* Add triggers */}
              <button
                onClick={onAddRequest}
                className="w-5 h-5 bg-[#2d2d2d] hover:bg-[#3a3a3a] text-gray-300 hover:text-white rounded flex items-center justify-center cursor-pointer transition-colors"
                title="Create new request"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search collections"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-5 bg-[#2d2d2d] focus:bg-[#333333] border-none rounded pl-2 pr-6 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none placeholder:text-[11px]"
                />
                <Search size={11} className="absolute right-2 top-1.5 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Tree List view */}
            <div
              onContextMenu={openRootContextMenu}
              className="flex-1 overflow-y-auto custom-scrollbar border-t border-[#2b2b2b]/60"
            >
              {filteredTree.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-[11px] flex flex-col gap-1">
                  <span>No results found</span>
                  <p className="text-[10px] text-gray-600">Try checking folder branches or add a new request.</p>
                </div>
              ) : (
                filteredTree.map(node => renderTreeNode(node, 0))
              )}
            </div>
          </>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-[1000] w-48 bg-[#2d2d2d] border border-[#3e3e3e] rounded shadow-2xl py-1 text-[12px] text-gray-200 select-none"
        >
          {contextMenu.type === 'root' && (
            <>
              <button
                onClick={() => { onAddFolder?.(); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus size={13} className="text-gray-400" /> Yangi papka
              </button>
              <button
                onClick={() => { onAddRequest?.(); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <FilePlus size={13} className="text-gray-400" /> Yangi so'rov
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && (
            <>
              <button
                onClick={() => { onToggleFolder(contextMenu.folderId); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <ChevronRight size={13} className="text-gray-400" /> Ochish / Yopish
              </button>
              <button
                onClick={() => {
                  const current = findFolderName(filteredTree, contextMenu.folderId);
                  startRenamingFolder(contextMenu.folderId, current);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <FileText size={13} className="text-gray-400" /> Nomini o'zgartirish
              </button>
              <button
                onClick={() => { onAddSubfolder?.(contextMenu.folderId); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus size={13} className="text-gray-400" /> Yangi ichki papka
              </button>
              <button
                onClick={() => { onAddRequestInFolder?.(contextMenu.folderId); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 cursor-pointer"
              >
                <FilePlus size={13} className="text-gray-400" /> Yangi so'rov
              </button>
              <div className="my-1 border-t border-[#3e3e3e]" />
              <button
                onClick={() => { onDeleteFolder?.(contextMenu.folderId); setContextMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] text-red-400 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={13} /> Papkani o'chirish
              </button>
            </>
          )}

          {contextMenu.type === 'request' && (
            <button
              onClick={() => { onDeleteRequest?.(contextMenu.requestId); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] text-red-400 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} /> So'rovni o'chirish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
