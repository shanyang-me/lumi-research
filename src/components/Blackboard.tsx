"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pin,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Server,
  Database,
  Cloud,
  Key,
  FileText,
  ChevronDown,
} from "lucide-react";

interface BoardNote {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: "machine", label: "MACHINE", icon: Server, color: "#f472b6" },
  { id: "dataset", label: "DATASET", icon: Database, color: "#60a5fa" },
  { id: "cloud", label: "CLOUD", icon: Cloud, color: "#4cc9f0" },
  { id: "credentials", label: "CREDS", icon: Key, color: "#fbbf24" },
  { id: "general", label: "GENERAL", icon: FileText, color: "#a78bfa" },
] as const;

function getCategoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.id === cat) || CATEGORIES[4];
}

export function Blackboard({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/board`);
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }, [projectId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formTitle.trim()) return;
    await fetch(`/api/projects/${projectId}/board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        content: formContent,
        category: formCategory,
      }),
    });
    resetForm();
    loadNotes();
  };

  const handleUpdate = async (noteId: string) => {
    await fetch(`/api/board/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        content: formContent,
        category: formCategory,
      }),
    });
    resetForm();
    loadNotes();
  };

  const handleDelete = async (noteId: string) => {
    await fetch(`/api/board/${noteId}`, { method: "DELETE" });
    loadNotes();
  };

  const handlePin = async (note: BoardNote) => {
    await fetch(`/api/board/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    loadNotes();
  };

  const startEdit = (note: BoardNote) => {
    setEditingId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category);
  };

  const filtered = filterCat
    ? notes.filter((n) => n.category === filterCat)
    : notes;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Blackboard frame */}
      <div className="m-4">
        {/* Chalk tray top */}
        <div className="h-3 bg-[#5c3a1e] border-2 border-[#8b6914] border-b-0" />

        {/* Board surface */}
        <div
          className="border-x-[6px] border-[#8b6914] min-h-[500px] p-4 relative"
          style={{
            background: "linear-gradient(180deg, #1a2e1a 0%, #162816 50%, #1a2e1a 100%)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Chalk dust texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
              backgroundSize: "8px 8px",
            }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className="font-pixel text-[10px] tracking-[4px]"
                style={{
                  color: "#c8d8c0",
                  textShadow: "0 0 8px rgba(200,216,192,0.3)",
                }}
              >
                BLACKBOARD
              </span>
              <span className="text-[9px] text-[#5a7a52]">
                {notes.length} note{notes.length !== 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={() => {
                resetForm();
                setAdding(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-[#5a7a52] text-[#c8d8c0] hover:border-[#8bba80] hover:text-[#e0f0d8] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="font-pixel text-[7px]">WRITE</span>
            </button>
          </div>

          {/* Category filter tabs */}
          <div className="relative flex items-center gap-1 mb-4 flex-wrap">
            <button
              onClick={() => setFilterCat(null)}
              className={`px-2 py-1 text-[8px] font-pixel border transition-colors ${
                filterCat === null
                  ? "border-[#8bba80] text-[#c8d8c0] bg-[#2a4a2a]"
                  : "border-transparent text-[#5a7a52] hover:text-[#8bba80]"
              }`}
            >
              ALL
            </button>
            {CATEGORIES.map((cat) => {
              const count = notes.filter((n) => n.category === cat.id).length;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCat(filterCat === cat.id ? null : cat.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[7px] font-pixel border transition-colors ${
                    filterCat === cat.id
                      ? "border-[#8bba80] bg-[#2a4a2a]"
                      : "border-transparent hover:border-[#3a5a3a]"
                  }`}
                  style={{
                    color: filterCat === cat.id ? cat.color : "#5a7a52",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {cat.label}
                  {count > 0 && (
                    <span className="text-[6px] opacity-60">({count})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chalk line divider */}
          <div className="h-[1px] bg-[#3a5a3a] mb-4 opacity-50" />

          {/* Add/Edit form */}
          {(adding || editingId) && (
            <div className="mb-4 border-2 border-dashed border-[#5a7a52] p-3 bg-[#1a2e1a]/60">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="font-pixel text-[7px]"
                  style={{ color: "#c8d8c0" }}
                >
                  {editingId ? "EDIT NOTE" : "NEW NOTE"}
                </span>
              </div>

              <input
                type="text"
                placeholder="Title..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-transparent border-b border-[#5a7a52] text-[#e0f0d8] text-[11px] px-1 py-1.5 mb-2 outline-none placeholder:text-[#3a5a3a] font-mono"
              />

              <textarea
                placeholder="Content... (machine IPs, paths, configs, etc.)"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                className="w-full bg-transparent border border-[#3a5a3a] text-[#c8d8c0] text-[10px] p-2 mb-2 outline-none placeholder:text-[#3a5a3a] font-mono resize-y"
              />

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="appearance-none bg-[#2a4a2a] border border-[#5a7a52] text-[#c8d8c0] text-[9px] font-pixel pl-2 pr-6 py-1 outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#5a7a52] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="flex-1" />

                <button
                  onClick={resetForm}
                  className="flex items-center gap-1 px-2 py-1 text-[8px] text-[#5a7a52] hover:text-[#c8d8c0] transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">CANCEL</span>
                </button>
                <button
                  onClick={() =>
                    editingId ? handleUpdate(editingId) : handleAdd()
                  }
                  disabled={!formTitle.trim()}
                  className="flex items-center gap-1 px-3 py-1 border border-[#8bba80] text-[#c8d8c0] hover:bg-[#2a4a2a] transition-colors disabled:opacity-30"
                >
                  <Check className="w-3 h-3" />
                  <span className="font-pixel text-[6px]">
                    {editingId ? "SAVE" : "POST"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Notes grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#3a5a3a]">
              <FileText className="w-8 h-8 mb-3 opacity-40" />
              <span className="font-pixel text-[8px]">
                {filterCat ? "NO NOTES IN THIS CATEGORY" : "BOARD IS EMPTY"}
              </span>
              <span className="text-[9px] mt-1 opacity-60">
                Write something with the + WRITE button
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((note) => {
                const meta = getCategoryMeta(note.category);
                const Icon = meta.icon;
                return (
                  <div
                    key={note.id}
                    className="group relative border border-[#3a5a3a] p-3 transition-colors hover:border-[#5a7a52]"
                    style={{
                      background: note.pinned
                        ? "rgba(42,74,42,0.4)"
                        : "rgba(26,46,26,0.4)",
                    }}
                  >
                    {/* Pin indicator */}
                    {note.pinned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#fbbf24] flex items-center justify-center">
                        <Pin className="w-2.5 h-2.5 text-[#1a2e1a]" />
                      </div>
                    )}

                    {/* Header row */}
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="w-5 h-5 flex items-center justify-center border shrink-0 mt-0.5"
                        style={{
                          borderColor: meta.color,
                          background: `${meta.color}10`,
                        }}
                      >
                        <Icon className="w-3 h-3" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className="font-pixel text-[8px] tracking-wider truncate"
                            style={{
                              color: "#e0f0d8",
                              textShadow: "0 0 6px rgba(200,216,192,0.15)",
                            }}
                          >
                            {note.title.toUpperCase()}
                          </h3>
                          <span
                            className="font-pixel text-[6px] shrink-0"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <pre
                      className="text-[10px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                      style={{
                        color: "#b0c8a8",
                        textShadow: "0 0 4px rgba(176,200,168,0.1)",
                      }}
                    >
                      {note.content}
                    </pre>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2a4a2a]">
                      <span className="text-[8px] text-[#3a5a3a]">
                        {new Date(note.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {/* Action buttons - shown on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePin(note)}
                          className="p-1 hover:bg-[#2a4a2a] transition-colors"
                          title={note.pinned ? "Unpin" : "Pin"}
                        >
                          <Pin
                            className="w-3 h-3"
                            style={{
                              color: note.pinned ? "#fbbf24" : "#5a7a52",
                            }}
                          />
                        </button>
                        <button
                          onClick={() => startEdit(note)}
                          className="p-1 hover:bg-[#2a4a2a] transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3 h-3 text-[#5a7a52]" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1 hover:bg-[#2a4a2a] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-[#5a7a52] hover:text-[#f87171]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chalk tray bottom */}
        <div className="h-4 bg-[#5c3a1e] border-2 border-[#8b6914] border-t-0 flex items-center justify-center gap-4 px-4">
          {/* Chalk pieces */}
          <div className="w-6 h-1.5 bg-[#e8e0d0] rounded-sm opacity-60" />
          <div className="w-4 h-1.5 bg-[#fbbf24] rounded-sm opacity-60" />
          <div className="w-5 h-1.5 bg-[#60a5fa] rounded-sm opacity-60" />
          <div className="w-3 h-1.5 bg-[#f472b6] rounded-sm opacity-60" />
        </div>
      </div>
    </div>
  );
}
