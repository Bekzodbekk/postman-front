import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Globe } from 'lucide-react';
import { EnvironmentVariable } from '../types';
import { EnvironmentDTO } from '../lib/api';

interface EnvironmentsPanelProps {
  environments: EnvironmentDTO[];
  onAddEnvironment?: () => void;
  onUpdateEnvironment?: (id: number, name: string, variables: EnvironmentVariable[]) => void;
  onSetActiveEnvironment?: (id: number) => void;
  onDeleteEnvironment?: (id: number) => void;
}

const genId = () => Math.random().toString(36).substring(2, 9);
const emptyVar = (): EnvironmentVariable => ({ id: genId(), key: '', value: '', enabled: true });

export default function EnvironmentsPanel({
  environments,
  onAddEnvironment,
  onUpdateEnvironment,
  onSetActiveEnvironment,
  onDeleteEnvironment
}: EnvironmentsPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(environments[0]?.id ?? null);
  const [nameDraft, setNameDraft] = useState('');
  const [rows, setRows] = useState<EnvironmentVariable[]>([emptyVar()]);

  const selected = environments.find(e => e.id === selectedId) || null;

  useEffect(() => {
    if (!selected && environments.length > 0) {
      setSelectedId(environments[0].id);
      return;
    }
    if (selected) {
      setNameDraft(selected.name);
      setRows(selected.variables.length > 0 ? selected.variables : [emptyVar()]);
    }
  }, [selectedId, environments]);

  const commitName = () => {
    if (selected && nameDraft.trim() && nameDraft.trim() !== selected.name) {
      onUpdateEnvironment?.(selected.id, nameDraft.trim(), rows);
    }
  };

  const updateRow = (index: number, field: keyof EnvironmentVariable, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };

    const last = newRows[newRows.length - 1];
    if (last && (last.key || last.value)) {
      newRows.push(emptyVar());
    }

    setRows(newRows);
  };

  const commitRows = () => {
    if (selected) {
      onUpdateEnvironment?.(selected.id, nameDraft.trim() || selected.name, rows);
    }
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    if (selected) {
      onUpdateEnvironment?.(selected.id, nameDraft.trim() || selected.name, newRows);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Environment list */}
      <div className="border-b border-[#2b2b2b]/60 max-h-[160px] overflow-y-auto custom-scrollbar">
        {environments.length === 0 ? (
          <div className="p-3 text-[11px] text-gray-500">Hali environment yo'q.</div>
        ) : (
          environments.map((env) => (
            <div
              key={env.id}
              onClick={() => setSelectedId(env.id)}
              className={`h-[30px] px-3 flex items-center justify-between cursor-pointer text-[12px] group ${
                selectedId === env.id ? 'bg-[#2b2b2b]/70 text-white' : 'text-gray-300 hover:bg-[#2b2b2b]/40'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetActiveEnvironment?.(env.id); }}
                  className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                    env.is_active ? 'bg-[#0cbb52] border-[#0cbb52]' : 'border-gray-500'
                  }`}
                  title={env.is_active ? 'Aktiv' : 'Aktiv qilish'}
                />
                <span className="truncate">{env.name}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteEnvironment?.(env.id); if (selectedId === env.id) setSelectedId(null); }}
                className="hidden group-hover:flex w-5 h-5 items-center justify-center text-gray-500 hover:text-red-400 rounded shrink-0"
                title="O'chirish"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onAddEnvironment}
        className="h-[30px] px-3 flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white hover:bg-[#2b2b2b]/40 cursor-pointer border-b border-[#2b2b2b]/60"
      >
        <Plus size={12} /> Yangi environment
      </button>

      {/* Variables editor for the selected environment */}
      {selected ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }}
            className="w-full bg-[#2d2d2d] border border-[#3e3e3e] rounded px-2 py-1 text-[12px] text-gray-100 outline-none mb-3 focus:border-[#ef5b25]/60"
            placeholder="Environment nomi"
          />

          <table className="w-full text-left text-[11px] text-gray-300 font-mono">
            <thead>
              <tr className="border-b border-[#2b2b2b] text-[10px] text-gray-500 uppercase">
                <th className="w-6"></th>
                <th className="px-1 py-1.5">Variable</th>
                <th className="px-1 py-1.5">Value</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b2b2b]/50">
              {rows.map((row, index) => (
                <tr key={row.id} className="group">
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => updateRow(index, 'enabled', e.target.checked)}
                      onBlur={commitRows}
                      className="accent-[#ef5b25] cursor-pointer"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={row.key}
                      onChange={(e) => updateRow(index, 'key', e.target.value)}
                      onBlur={commitRows}
                      placeholder="Variable name"
                      className="w-full bg-transparent outline-none text-gray-200 placeholder-gray-600"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      value={row.value}
                      onChange={(e) => updateRow(index, 'value', e.target.value)}
                      onBlur={commitRows}
                      placeholder="Value"
                      className="w-full bg-transparent outline-none text-gray-200 placeholder-gray-600"
                    />
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => deleteRow(index)}
                      className="hidden group-hover:inline-flex text-gray-600 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-[11px] gap-2 p-4 text-center">
          <Globe size={20} className="text-gray-600" />
          <span>Environment tanlang yoki yangisini yarating.</span>
        </div>
      )}
    </div>
  );
}
