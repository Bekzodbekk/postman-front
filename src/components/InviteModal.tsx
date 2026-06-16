import React, { useEffect, useState } from 'react';
import { X, UserPlus, Trash2, Mail } from 'lucide-react';
import { FolderDTO, CollaboratorDTO, inviteToFolder, listCollaborators, removeCollaborator } from '../lib/api';

interface InviteModalProps {
  token: string;
  rootFolders: FolderDTO[];
  onClose: () => void;
}

export default function InviteModal({ token, rootFolders, onClose }: InviteModalProps) {
  const [folderId, setFolderId] = useState<number | null>(rootFolders[0]?.id ?? null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'developer' | 'viewer'>('developer');
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCollaborators = (fid: number) => {
    listCollaborators(token, fid).then(setCollaborators).catch(() => setCollaborators([]));
  };

  useEffect(() => {
    if (folderId != null) loadCollaborators(folderId);
  }, [folderId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId || !email.trim()) return;

    setError('');
    setIsSubmitting(true);
    try {
      await inviteToFolder(token, folderId, email.trim(), role);
      setEmail('');
      loadCollaborators(folderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Taklif yuborishda xatolik.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!folderId) return;
    try {
      await removeCollaborator(token, folderId, userId);
      loadCollaborators(folderId);
    } catch {
      // ignore — list will just stay as-is on failure
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#212121] border border-[#3e3e3e] rounded-lg shadow-2xl w-[440px] text-gray-200"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2b2b]">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus size={15} className="text-[#ef5b25]" /> Hamkasblarni taklif qilish
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {rootFolders.length === 0 ? (
            <p className="text-xs text-gray-500">
              Sizda hali asosiy (root) papka yo'q. Avval birorta papka yarating.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5">Papka (faqat asosiy papkalar)</label>
                <select
                  value={folderId ?? ''}
                  onChange={(e) => setFolderId(Number(e.target.value))}
                  className="w-full bg-[#2d2d2d] border border-[#3e3e3e] rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#ef5b25]/60"
                >
                  {rootFolders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleInvite} className="space-y-2">
                <label className="block text-[11px] text-gray-400 mb-1.5">Elektron pochta</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-[#2d2d2d] border border-[#3e3e3e] rounded px-2.5 h-8">
                    <Mail size={13} className="text-gray-500 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="flex-1 bg-transparent outline-none text-xs placeholder:text-gray-600"
                    />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'developer' | 'viewer')}
                    className="bg-[#2d2d2d] border border-[#3e3e3e] rounded px-2 h-8 text-xs outline-none focus:border-[#ef5b25]/60"
                  >
                    <option value="developer">Developer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                {error && <p className="text-[11px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting || !folderId}
                  className="w-full h-8 bg-[#ef5b25] hover:bg-[#f36e3c] disabled:opacity-50 text-white text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  {isSubmitting ? 'Yuborilmoqda...' : 'Taklif qilish'}
                </button>
              </form>

              <div className="border-t border-[#2b2b2b] pt-3">
                <h3 className="text-[11px] text-gray-500 mb-2 uppercase tracking-wide">
                  Hamkasblar — <span className="text-gray-300">{rootFolders.find(f => f.id === folderId)?.name}</span>
                </h3>
                {collaborators.length === 0 ? (
                  <p className="text-[11px] text-gray-600">Hali hech kim taklif qilinmagan.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                    {collaborators.map((c) => (
                      <div key={c.user_id} className="flex items-center justify-between bg-[#2d2d2d] rounded px-2.5 py-1.5 text-xs">
                        <div className="flex flex-col truncate">
                          <span className="text-gray-200 truncate">{c.login}</span>
                          <span className="text-gray-500 text-[10px] truncate">{c.email}</span>
                          <span className="text-gray-600 text-[10px] truncate">
                            Papka: {rootFolders.find(f => f.id === folderId)?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                            c.role === 'developer' ? 'bg-[#097bed]/20 text-[#a6d1ff]' : 'bg-gray-600/30 text-gray-300'
                          }`}>
                            {c.role}
                          </span>
                          <button
                            onClick={() => handleRemove(c.user_id)}
                            className="text-gray-500 hover:text-red-400 cursor-pointer"
                            title="Ulashishni bekor qilish"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
