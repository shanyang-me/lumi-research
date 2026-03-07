"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="text-sm font-medium mb-1 block">{field.label}</label>
              {field.type === "textarea" ? (
                <Textarea
                  placeholder={field.placeholder}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  required={field.required}
                />
              ) : field.type === "select" ? (
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
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
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  multiple
                  value={(values[field.name] as string[]) || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                    setValues({ ...values, [field.name]: selected });
                  }}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  value={(values[field.name] as string) || ""}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
