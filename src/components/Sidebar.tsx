"use client";

import { Lightbulb } from "lucide-react";

interface SidebarProps {
  activeView: string;
  activeProjectId: string | null;
  onNavigate: (view: string, projectId?: string) => void;
  onNewProject: () => void;
  refreshKey: number;
}

export function Sidebar({
  onNavigate,
}: SidebarProps) {
  return (
    <div className="w-10 h-screen flex flex-col items-center bg-[#0f0f23] border-r-2 border-[#374151]">
      {/* Logo / Home button */}
      <button
        onClick={() => onNavigate("dashboard")}
        className="py-3 w-full flex justify-center hover:bg-[#1a1a2e] transition-colors group"
        title="Headquarters"
      >
        <div className="w-7 h-7 bg-[#7c3aed] border-2 border-[#a78bfa] flex items-center justify-center group-hover:border-[#c4b5fd] transition-colors">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
        </div>
      </button>

      <div className="flex-1" />

      {/* Footer */}
      <div className="py-2 w-full flex justify-center">
        <div className="w-1.5 h-1.5 bg-green-400 animate-pulse" />
      </div>
    </div>
  );
}
