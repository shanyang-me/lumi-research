"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/types";
import { Trash2, Edit2 } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface EntityTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  entityType: string;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function EntityTable({ columns, data, onDelete, onEdit }: EntityTableProps) {
  if (data.length === 0) {
    return (
      <div className="pixel-border bg-[#111827] p-8 text-center">
        <p className="font-pixel text-[8px] text-[#4b5563]">EMPTY INVENTORY</p>
        <p className="text-[10px] text-[#6b7280] mt-1">No items yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="pixel-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#0f0f23] border-b-2 border-[#374151]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-3 py-2 font-pixel text-[7px] text-[#6b7280] tracking-wider uppercase"
              >
                {col.label}
              </th>
            ))}
            <th className="w-16 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id as string}
              className={`border-t border-[#1f2937] hover:bg-[#1a1a2e] transition-colors ${
                i % 2 === 0 ? "bg-[#111827]" : "bg-[#0f1520]"
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-[#9ca3af]">
                  {col.render ? (
                    col.render(row[col.key], row)
                  ) : col.key === "status" ? (
                    <Badge className={`font-pixel text-[6px] ${STATUS_COLORS[row[col.key] as string] || ""}`}>
                      {(row[col.key] as string).toUpperCase()}
                    </Badge>
                  ) : (
                    <span className="line-clamp-1">{String(row[col.key] ?? "")}</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button
                    className="w-6 h-6 flex items-center justify-center text-[#6b7280] hover:text-[#a78bfa] hover:bg-[#1a1a2e] transition-colors"
                    onClick={() => onEdit(row.id as string)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    className="w-6 h-6 flex items-center justify-center text-[#6b7280] hover:text-[#ef4444] hover:bg-[#1a1a2e] transition-colors"
                    onClick={() => onDelete(row.id as string)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
