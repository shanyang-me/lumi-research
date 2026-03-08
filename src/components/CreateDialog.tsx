"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "multiselect";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: Field[];
  onSubmit: (data: Record<string, string | string[]>) => Promise<void>;
}

export function CreateDialog({ open, onClose, title, fields, onSubmit }: CreateDialogProps) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(values);
      setValues({});
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border-2 border-[#374151] shadow-[4px_4px_0_#0a0a1a]">
        <DialogHeader>
          <DialogTitle className="font-pixel text-[10px] text-[#a78bfa] tracking-wider">
            {title.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="font-pixel text-[7px] text-[#6b7280] mb-1.5 block tracking-wider uppercase">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  placeholder={field.placeholder}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  required={field.required}
                  rows={3}
                  className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs p-2 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151] resize-none"
                />
              ) : field.type === "select" ? (
                <select
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "multiselect" ? (
                <select
                  multiple
                  value={(values[field.name] as string[]) || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                    setValues({ ...values, [field.name]: selected });
                  }}
                  style={{ minHeight: 80 }}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  required={field.required}
                  className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs p-2 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151]"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn bg-[#1f2937] px-4 py-2 text-[10px] text-[#9ca3af]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="pixel-btn bg-[#7c3aed] px-4 py-2 text-[10px] text-white border-[#a78bfa] disabled:opacity-50"
            >
              {loading ? "CREATING..." : "CREATE"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
