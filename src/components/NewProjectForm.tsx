"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  CheckCircle2,
  Flame,
  Route,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface NewProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

const TEMPLATE_FIELDS = [
  {
    name: "problem",
    label: "OBJECTIVE",
    icon: Target,
    color: "#a78bfa",
    placeholder: "What problem are you trying to solve?",
    hint: "Be specific. A well-defined problem is half the solution.",
    type: "textarea" as const,
  },
  {
    name: "successCriteria",
    label: "WIN CONDITION",
    icon: CheckCircle2,
    color: "#34d399",
    placeholder: "How will you know this research succeeded?",
    hint: "e.g., Achieve >90% accuracy on benchmark X.",
    type: "textarea" as const,
  },
  {
    name: "motivation",
    label: "MOTIVATION",
    icon: Flame,
    color: "#fb923c",
    placeholder: "Why is this problem important?",
    hint: "Connect to the bigger picture.",
    type: "textarea" as const,
  },
  {
    name: "approach",
    label: "STRATEGY",
    icon: Route,
    color: "#60a5fa",
    placeholder: "What is your high-level approach?",
    hint: "Outline your strategy.",
    type: "textarea" as const,
  },
  {
    name: "timeline",
    label: "TIMELINE",
    icon: Clock,
    color: "#6b7280",
    placeholder: "e.g., 3 months: Month 1 - data, Month 2 - experiments",
    hint: "A rough timeline helps track progress.",
    type: "text" as const,
  },
];

export function NewProjectForm({ open, onClose, onSubmit }: NewProjectFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const set = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(values);
      setValues({});
      setStep(0);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 0 ? !!values.name?.trim() : true;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { onClose(); setStep(0); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111827] border-2 border-[#374151] shadow-[4px_4px_0_#0a0a1a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a78bfa]" />
            <span className="font-pixel text-[10px] text-[#a78bfa] tracking-wider">
              NEW QUEST
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 text-[8px] font-pixel tracking-wider ${
            step === 0
              ? "bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]"
              : "bg-[#1f2937] text-[#4b5563] border border-[#374151]"
          }`}>
            1. BASICS
          </div>
          <ChevronRight className="w-3 h-3 text-[#374151]" />
          <div className={`flex items-center gap-1.5 px-2 py-1 text-[8px] font-pixel tracking-wider ${
            step === 1
              ? "bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]"
              : "bg-[#1f2937] text-[#4b5563] border border-[#374151]"
          }`}>
            2. TEMPLATE
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="font-pixel text-[7px] text-[#6b7280] mb-1.5 block tracking-wider">
                QUEST NAME *
              </label>
              <input
                value={values.name || ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g., Physics World Models for Robotic Manipulation"
                className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-sm p-2.5 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151]"
                autoFocus
              />
            </div>
            <div>
              <label className="font-pixel text-[7px] text-[#6b7280] mb-1.5 block tracking-wider">
                DESCRIPTION
              </label>
              <textarea
                value={values.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="One-paragraph summary of the research project"
                rows={3}
                className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs p-2.5 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151] resize-none"
              />
            </div>

            <div className="pixel-divider" />

            <div className="flex justify-between pt-2">
              <button
                onClick={onClose}
                className="pixel-btn bg-[#1f2937] px-4 py-2 text-[10px] text-[#9ca3af]"
              >
                CANCEL
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed || loading}
                  className="pixel-btn bg-[#1f2937] px-3 py-2 text-[10px] text-[#9ca3af] disabled:opacity-50"
                >
                  QUICK CREATE
                </button>
                <button
                  onClick={() => setStep(1)}
                  disabled={!canProceed}
                  className="pixel-btn bg-[#7c3aed] px-3 py-2 text-[10px] text-white border-[#a78bfa] disabled:opacity-50 flex items-center gap-1"
                >
                  TEMPLATE
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[10px] text-[#6b7280]">
              Define the research scope. All fields are optional.
            </p>

            {TEMPLATE_FIELDS.map((field) => (
              <div key={field.name}>
                <label className="flex items-center gap-1.5 font-pixel text-[7px] mb-1.5 tracking-wider" style={{ color: field.color }}>
                  <field.icon className="w-3 h-3" />
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.name] || ""}
                    onChange={(e) => set(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs p-2 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151] resize-none"
                  />
                ) : (
                  <input
                    value={values[field.name] || ""}
                    onChange={(e) => set(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-[#0a0a1a] border-2 border-[#374151] text-[#e5e7eb] text-xs p-2 focus:border-[#a78bfa] focus:outline-none placeholder:text-[#374151]"
                  />
                )}
              </div>
            ))}

            <div className="pixel-divider" />

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setStep(0)}
                className="pixel-btn bg-[#1f2937] px-3 py-2 text-[10px] text-[#9ca3af] flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="pixel-btn bg-[#7c3aed] px-4 py-2 text-[10px] text-white border-[#a78bfa] disabled:opacity-50"
              >
                {loading ? "CREATING..." : "CREATE QUEST"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
