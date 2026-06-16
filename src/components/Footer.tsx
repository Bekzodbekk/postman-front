import React from 'react';
import { 
  Wifi, 
  Search, 
  Terminal, 
  Cpu, 
  PlayCircle, 
  Globe, 
  Trash2, 
  Lock, 
  Cookie,
  Bot
} from 'lucide-react';

interface FooterProps {
  onToggleConsole?: () => void;
  consoleOpen?: boolean;
}

export default function Footer({ onToggleConsole, consoleOpen }: FooterProps) {
  return (
    <footer className="h-[28px] bg-[#1c1c1c] border-t border-[#2b2b2b] flex items-center justify-between px-3 text-[11px] text-gray-400 select-none font-sans shrink-0">
      {/* Left items */}
      <div className="flex items-center gap-4">
        {/* Online network stamp */}
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
          <span className="w-1.5 h-1.5 bg-[#0cbb52] rounded-full"></span>
          <span>Online</span>
        </div>

        {/* Find and Replace actions */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <Search size={11} />
          <span>Find and replace</span>
        </button>

        {/* Console logs */}
        <button 
          onClick={onToggleConsole}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
            consoleOpen ? 'bg-[#ef5b25]/20 text-[#ef5b25] font-semibold' : 'hover:text-white'
          }`}
        >
          <Terminal size={11} />
          <span>Console</span>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Postbot AI tool */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer text-[#d6a5ff] font-medium transition-all hover:scale-105">
          <Bot size={12} className="text-purple-400 fill-purple-400/20" />
          <span>Postbot</span>
        </button>

        {/* Runner */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <PlayCircle size={11} className="text-gray-500" />
          <span>Runner</span>
        </button>

        {/* Capture requests */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <Globe size={11} className="text-gray-500" />
          <span>Capture requests</span>
        </button>

        {/* Cookies */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <Cookie size={11} className="text-gray-500" />
          <span>Cookies</span>
        </button>

        {/* Vault */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <Lock size={11} className="text-gray-500" />
          <span>Vault</span>
        </button>

        {/* Trash */}
        <button className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors" title="View trash">
          <Trash2 size={11} className="text-gray-500" />
          <span>Trash</span>
        </button>
      </div>
    </footer>
  );
}
