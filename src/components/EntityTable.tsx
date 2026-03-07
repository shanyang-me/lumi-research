"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="text-center py-8 text-muted-foreground text-sm">
        No items yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-2 font-medium">
                {col.label}
              </th>
            ))}
            <th className="w-20 px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id as string} className="border-t hover:bg-muted/30">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5">
                  {col.render ? (
                    col.render(row[col.key], row)
                  ) : col.key === "status" ? (
                    <Badge className={STATUS_COLORS[row[col.key] as string] || ""}>
                      {row[col.key] as string}
                    </Badge>
                  ) : (
                    <span className="line-clamp-1">{String(row[col.key] ?? "")}</span>
                  )}
                </td>
              ))}
              <td className="px-4 py-2.5">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(row.id as string)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => onDelete(row.id as string)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
