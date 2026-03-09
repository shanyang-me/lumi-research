"use client";

import {
  Lightbulb,
  Bot,
  LayoutDashboard,
  Swords,
} from "lucide-react";

interface SidebarProps {
  activeView: string;
  activeProjectId: string | null;
  onNavigate: (view: string, projectId?: string) => void;
  onNewProject: () => void;
  refreshKey: number;
}

export function Sidebar({
  activeView,
  onNavigate,
  onNewProject,
}: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "HQ", icon: LayoutDashboard },
    { id: "arena", label: "ARENA", icon: Swords },
    { id: "agent", label: "ORACLE", icon: Bot },
  ];

  return (
    <div className="w-56 h-screen flex flex-col bg-[#0f0f23] border-r-2 border-[#374151]">
      {/* Logo */}
      <div className="p-3 border-b-2 border-[#374151]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7c3aed] border-2 border-[#a78bfa] flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-yellow-300" />
          </div>
          <div>
            <h1 className="font-pixel text-[10px] text-[#a78bfa] leading-tight tracking-wider">
              LUMI
            </h1>
            <p className="text-[8px] text-[#6b7280] font-pixel">RESEARCH QUEST</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="p-2 flex-1 overflow-auto">
        <div className="mb-3">
          <div className="px-2 mb-1">
            <span className="font-pixel text-[7px] text-[#6b7280] tracking-widest">
              MENU
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 mb-0.5 text-xs transition-all ${
                  isActive
                    ? "bg-[#1a1a2e] border-l-2 border-[#a78bfa] text-[#a78bfa]"
                    : "border-l-2 border-transparent text-[#9ca3af] hover:bg-[#111827] hover:text-[#e5e7eb]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-pixel text-[8px] tracking-wide">{item.label}</span>
                {isActive && (
                  <span className="ml-auto text-[#a78bfa] animate-blink font-pixel text-[8px]">
                    &lt;
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Footer */}
      <div className="p-2 border-t-2 border-[#374151]">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-green-400 animate-pulse" />
          <span className="text-[8px] font-pixel text-[#4b5563]">
            LV.1 RESEARCHER
          </span>
        </div>
      </div>
    </div>
  );
}
