import React, { useState } from 'react';
import { 
  Clipboard, 
  Check, 
  Search, 
  Maximize2, 
  CornerDownRight, 
  HelpCircle,
  FileText,
  Clock,
  HardDrive
} from 'lucide-react';
import { ApiResponse } from '../types';

interface ResponsePanelProps {
  response: ApiResponse | null | undefined;
  isSending: boolean;
}

export default function ResponsePanel({ response, isSending }: ResponsePanelProps) {
  const [responseTab, setResponseTab] = useState<'pretty' | 'raw' | 'preview'>('pretty');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status code color helper
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-[#0cbb52]'; // postman green
    if (code >= 300 && code < 400) return 'text-blue-400';
    return 'text-red-400';
  };

  // Simple custom JSON code syntax highlighter
  const renderHighlightedJson = (jsonString: string) => {
    try {
      // Parse to ensure valid JSON, then re-stringify for neat indentation
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);

      // Escape HTML characters safely
      const escaped = formatted
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Apply Regex tokens for colored highlights matching Postman:
      // - Keys: blue text
      // - Strings: olive green
      // - Numbers: light purple
      // - Booleans: peach/orange
      // - Nulls: gray
      const highlighted = escaped.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
        (match) => {
          let cls = 'text-gray-300'; // Default punctuation
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-[#a6d1ff] font-medium'; // Key
            } else {
              cls = 'text-[#ffd384]'; // String value
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-[#ff9d76] font-semibold'; // Boolean
          } else if (/null/.test(match)) {
            cls = 'text-gray-500 font-semibold'; // Null
          } else {
            cls = 'text-[#d6a5ff]'; // Number
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );

      return (
        <pre 
          className="font-mono text-xs leading-relaxed select-text overflow-x-auto w-full"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      );
    } catch (e) {
      // Fallback if not valid JSON
      return <pre className="font-mono text-xs text-gray-300 select-text overflow-x-auto whitespace-pre">{jsonString}</pre>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1c1c1c] overflow-hidden min-h-[250px] font-sans">
      {/* 1. Header label line */}
      <div className="h-[38px] px-4 flex items-center justify-between border-b border-[#2b2b2b] bg-[#1c1c1c] shrink-0 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-gray-300">
          <CornerDownRight size={13} className="text-gray-500" />
          <span>Response</span>
        </div>

        {/* Response Metrics (visible when response is present) */}
        {response && !isSending && (
          <div className="flex items-center gap-5 text-[11px] font-mono pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Status:</span>
              <span className={`font-bold ${getStatusColor(response.statusCode)}`}>
                {response.statusCode} {response.statusText}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-gray-500" />
              <span className="text-gray-500">Time:</span>
              <span className="text-emerald-400 font-bold">{response.timeMs} ms</span>
            </div>

            <div className="flex items-center gap-1.5">
              <HardDrive size={12} className="text-gray-500" />
              <span className="text-gray-500">Size:</span>
              <span className="text-emerald-400 font-bold">
                {(response.sizeBytes / 1024).toFixed(2)} KB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Response Area Container */}
      <div className="flex-1 overflow-auto bg-[#1c1c1c] relative flex flex-col min-h-0">
        
        {/* LOADING STATE */}
        {isSending && (
          <div className="absolute inset-0 bg-[#1c1c1c]/90 z-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-[#ef5b25] border-r-transparent border-b-[#ef5b25]/20 border-l-transparent animate-spin"></div>
            <span className="text-xs text-gray-400 font-mono tracking-medium animate-pulse">Sending request...</span>
          </div>
        )}

        {/* EMPTY STATE (Astronaut SVG) */}
        {!response ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none">
            {/* Detailed Vector SVG replicating the Postman astronaut */}
            <div className="w-44 h-44 mb-4 relative opacity-85">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 160 160" 
                className="w-full h-full"
              >
                {/* Background ambient solar circle */}
                <circle cx="80" cy="80" r="45" fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="80" cy="80" r="28" fill="none" stroke="#252525" strokeWidth="1" />
                
                {/* Background stars */}
                <path d="M40,30 L42,32 L40,34 L38,32 Z" fill="#4d4d4d" />
                <path d="M120,40 L121.5,41.5 L120,43 L118.5,41.5 Z" fill="#6d6d6d" />
                <path d="M30,110 L31,111 L30,112 L29,111 Z" fill="#555" />
                <path d="M135,100 L136.5,101.5 L135,103 L133.5,101.5 Z" fill="#ef5b25" fillOpacity="0.6" />
                
                {/* Little Rocket */}
                <g transform="translate(100, 45) rotate(35)">
                  {/* Fire Flame */}
                  <path d="M8,18 Q8,28 0,32 Q-8,28 -8,18 Z" fill="#ef5b25" className="animate-pulse" />
                  <path d="M4,18 Q4,24 0,27 Q-4,24 -4,18 Z" fill="#ffb400" />
                  {/* Body */}
                  <rect x="-6" y="-12" width="12" height="30" rx="6" fill="#777" />
                  <path d="M0,-20 L6,-10 L-6,-10 Z" fill="#ef5b25" />
                  {/* Wings */}
                  <path d="M-6,5 L-12,12 L-6,15 Z" fill="#444" />
                  <path d="M6,5 L12,12 L6,15 Z" fill="#444" />
                  {/* Window */}
                  <circle cx="0" cy="-2" r="3" fill="#a6d1ff" stroke="#222" strokeWidth="1" />
                </g>

                {/* Astronaut floating */}
                <g transform="translate(68, 65)">
                  {/* Space Suit Pack */}
                  <rect x="-8" y="10" width="28" height="26" rx="4" fill="#3a3a3a" stroke="#1c1c1c" strokeWidth="1.5" />
                  <rect x="-4" y="6" width="20" height="6" rx="1" fill="#4f4f4f" />
                  
                  {/* Oxygen Hose Line */}
                  <path d="M-8,25 C-18,22 -15,40 -2,34" fill="none" stroke="#ef5b25" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Left Leg */}
                  <rect x="-1" y="32" width="6" height="15" rx="3" fill="#6c6c6c" stroke="#1c1c1c" strokeWidth="1.5" />
                  <circle cx="2" cy="46" r="3" fill="#444" />

                  {/* Right Leg (bent in zero grav) */}
                  <g transform="translate(8, 31) rotate(-20)">
                    <rect x="0" y="0" width="6" height="16" rx="3" fill="#6c6c6c" stroke="#1c1c1c" strokeWidth="1.5" />
                    <circle cx="3" cy="15" r="3" fill="#444" />
                  </g>

                  {/* Body Torso */}
                  <rect x="-3" y="12" width="18" height="22" rx="6" fill="#888" stroke="#1c1c1c" strokeWidth="2" />
                  {/* Chest stripe */}
                  <rect x="1" y="16" width="10" height="4" fill="#ef5b25" rx="1" />
                  <circle cx="3" cy="24" r="2" fill="#aefbe3" />
                  <circle cx="9" cy="24" r="1.5" fill="#ffd384" />

                  {/* Left Arm (raised waving) */}
                  <g transform="translate(-3, 14) rotate(-50)">
                    <rect x="-12" y="-3" width="14" height="6" rx="3" fill="#6c6c6c" stroke="#1c1c1c" strokeWidth="1.5" />
                    <circle cx="-12" cy="0" r="3.5" fill="#ef5b25" />
                  </g>

                  {/* Right Arm (resting) */}
                  <g transform="translate(14, 16) rotate(35)">
                    <rect x="0" y="-2" width="12" height="5" rx="2" fill="#6c6c6c" stroke="#1c1c1c" strokeWidth="1.5" />
                    <circle cx="12" cy="0" r="3.5" fill="#444" />
                  </g>

                  {/* Helmet Dome */}
                  <circle cx="6" cy="5" r="12" fill="#888" stroke="#1c1c1c" strokeWidth="2" />
                  {/* Visor shield */}
                  <path d="M-2,5 C-2,-3 14,-3 14,5 C14,8 10,12 6,12 C2,12 -2,8 -2,5 Z" fill="#1b1c1e" stroke="#555" strokeWidth="1" />
                  {/* Visor shine */}
                  <path d="M1,2 Q5,-1 11,2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </g>
              </svg>
            </div>
            
            {/* Caption */}
            <span className="text-gray-400 font-medium text-xs tracking-wide">
              Click Send to get a response
            </span>
          </div>
        ) : (
          /* ACTUAL RESPONSE CONTENT PANE */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Response Toolbar Options (Pretty, Raw, Preview, Copy) */}
            <div className="h-[34px] px-4 bg-[#1f1f1f] border-b border-[#2b2b2b] flex items-center justify-between text-xs text-gray-400 select-none shrink-0">
              <div className="flex items-center gap-3">
                {/* Tabs selection */}
                <div className="flex items-center gap-4 border-r border-[#2b2b2b] pr-4">
                  <button
                    onClick={() => setResponseTab('pretty')}
                    className={`py-1.5 px-0.5 relative font-medium transition-colors cursor-pointer ${
                      responseTab === 'pretty' ? 'text-white' : 'hover:text-gray-200'
                    }`}
                  >
                    <span>Pretty</span>
                    {responseTab === 'pretty' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
                    )}
                  </button>

                  <button
                    onClick={() => setResponseTab('raw')}
                    className={`py-1.5 px-0.5 relative font-medium transition-colors cursor-pointer ${
                      responseTab === 'raw' ? 'text-white' : 'hover:text-gray-200'
                    }`}
                  >
                    <span>Raw</span>
                    {responseTab === 'raw' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
                    )}
                  </button>

                  <button
                    onClick={() => setResponseTab('preview')}
                    className={`py-1.5 px-0.5 relative font-medium transition-colors cursor-pointer ${
                      responseTab === 'preview' ? 'text-white' : 'hover:text-gray-200'
                    }`}
                  >
                    <span>Preview</span>
                    {responseTab === 'preview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ef5b25]"></div>
                    )}
                  </button>
                </div>

                {/* Sub-format indicator */}
                {responseTab === 'pretty' && (
                  <span className="text-[10px] text-[#0cbb52] bg-[#0cbb52]/10 border border-[#0cbb52]/20 font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                    JSON
                  </span>
                )}
              </div>

              {/* Utility Tools on Right */}
              <div className="flex items-center gap-3 text-gray-500">
                <button 
                  onClick={handleCopy}
                  className="hover:text-gray-200 p-1 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]" 
                  title="Copy payload"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-mono">Copied</span>
                    </>
                  ) : (
                    <>
                      <Clipboard size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button className="hover:text-gray-200 p-1 transition-colors cursor-pointer" title="Find inside response">
                  <Search size={12} />
                </button>
                <button className="hover:text-gray-200 p-1 transition-colors cursor-pointer animate-pulse" title="Maximize view">
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>

            {/* RESPONSE VALUE GRAPHICS VIEWPORT */}
            <div className="flex-1 p-4 overflow-y-auto select-text font-mono text-[12.5px] bg-[#161616] custom-scrollbar focus:outline-none">
              
              {responseTab === 'pretty' && (
                <div className="whitespace-pre flex select-text">
                  {renderHighlightedJson(response.body)}
                </div>
              )}

              {responseTab === 'raw' && (
                <pre className="text-gray-300 whitespace-pre overflow-x-auto select-text select-all block leading-relaxed selection:bg-blue-600/30">
                  {response.body}
                </pre>
              )}

              {responseTab === 'preview' && (
                <div className="text-gray-300 w-full font-sans select-text p-2 bg-[#212121] rounded border border-[#3e3e3e]/40">
                  <div className="bg-[#1c1c1c] p-2 border-b border-[#2d2d2d] rounded-t flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">Preview</span>
                  </div>
                  {/^\s*</.test(response.body) ? (
                    <iframe
                      title="response-preview"
                      sandbox=""
                      srcDoc={response.body}
                      className="w-full h-[300px] bg-white rounded-b"
                    />
                  ) : (
                    <div className="p-3 text-xs leading-relaxed font-mono text-gray-300 whitespace-pre-wrap break-all">
                      {response.body}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
