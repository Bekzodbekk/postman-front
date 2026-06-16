import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Plus,
  User,
  ChevronDown,
  SearchIcon,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  workspaceName?: string;
  onLogout?: () => void;
  onInviteClick?: () => void;
}

export default function Header({ workspaceName = "Bekzodbekk", onLogout, onInviteClick }: HeaderProps) {
  return (
    <header className="h-[46px] bg-[#1c1c1c] border-b border-[#2b2b2b] flex items-center justify-between px-3 text-xs select-none font-sans">
      {/* Left side actions */}
      <div className="flex items-center gap-4">
        {/* Nav Arrows */}
        <div className="flex items-center gap-2 text-gray-500">
          <button className="hover:text-gray-200 cursor-pointer p-0.5" title="Go back">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button className="hover:text-gray-200 cursor-not-allowed opacity-50 p-0.5" disabled>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Global navigation items */}
        <nav className="flex items-center gap-4 text-gray-300 font-medium">
          <button className="hover:text-white cursor-pointer px-1 py-1 transition-colors">
            Home
          </button>
          <button className="hover:text-white cursor-pointer px-1 py-1 flex items-center gap-1 transition-colors text-white font-semibold">
            Workspaces <ChevronDown size={11} className="mt-0.5 text-gray-400" />
          </button>
          <button className="hover:text-white cursor-pointer px-1 py-1 transition-colors">
            API Network
          </button>
        </nav>
      </div>

      {/* Middle search bar */}
      <div className="flex-1 max-w-[420px] mx-4 relative">
        <div className="flex items-center w-full h-[26px] bg-[#2d2d2d] hover:bg-[#383838] border border-[#3e3e3e] rounded px-2 gap-1.5 transition-colors cursor-pointer text-gray-400">
          <Search size={13} className="text-gray-400 shrink-0" />
          <span className="text-left text-gray-400 truncate grow">Search Postman</span>
          <span className="text-[10px] font-mono bg-[#1c1c1c] text-gray-400 px-1.5 py-0.5 rounded border border-[#303030] shrink-0 scale-90">
            Ctrl K
          </span>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Collaborative Avatars */}
        <div className="flex -space-x-1 items-center">
          <div className="w-5 h-5 rounded-full bg-[#ef5b25] border border-[#1c1c1c] flex items-center justify-center text-[9px] font-bold text-white uppercase" title="Bekzod Nematov">
            B
          </div>
          <div className="w-5 h-5 rounded-full bg-blue-600 border border-[#1c1c1c] flex items-center justify-center text-[9px] font-bold text-white uppercase" title="Collaborator X">
            X
          </div>
        </div>

        {/* Invite button */}
        <button
          onClick={onInviteClick}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium h-[26px] px-2.5 rounded flex items-center gap-1 cursor-pointer transition-colors scale-[0.95] origin-right"
        >
          <Plus size={13} strokeWidth={2.5} />
          <span>Invite</span>
        </button>

        {/* Option Icons */}
        <div className="flex items-center gap-2 text-gray-400">
          <button className="hover:text-white hover:bg-[#2d2d2d] rounded p-1 transition-colors cursor-pointer" title="Settings">
            <Settings size={15} />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="hover:text-white hover:bg-[#2d2d2d] rounded p-1 transition-colors cursor-pointer"
              title="Chiqish"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* Upgrade Button */}
        <button className="bg-[#ef5b25] hover:bg-[#f36e3c] text-white font-semibold text-xs h-[26px] px-3 rounded transition-all cursor-pointer shadow-sm scale-[0.95]" id="btn-upgrade">
          Upgrade
        </button>
      </div>
    </header>
  );
}
