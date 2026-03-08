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
import { Separator } from "@/components/ui/separator";
import {
  Target,
  CheckCircle2,
  Flame,
  Route,
  Clock,
  FileText,
  Sparkles,
} from "lucide-react";

interface NewProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

const TEMPLATE_FIELDS = [
  {
    name: "problem",
    label: "Problem Statement",
    icon: Target,
    placeholder: "What problem are you trying to solve? What question are you investigating?",
    hint: "Be specific. A well-defined problem is half the solution.",
    type: "textarea" as const,
  },
  {
    name: "successCriteria",
    label: "Success Criteria",
    icon: CheckCircle2,
    placeholder: "How will you know this research succeeded? What metrics or outcomes define success?",
    hint: "e.g., Achieve >90% accuracy on benchmark X, or demonstrate feasibility of approach Y.",
    type: "textarea" as const,
  },
  {
    name: "motivation",
    label: "Motivation",
    icon: Flame,
    placeholder: "Why is this problem important? What impact would solving it have?",
    hint: "Connect to the bigger picture - why should anyone care about this work?",
    type: "textarea" as const,
  },
  {
    name: "approach",
    label: "Approach / Methodology",
    icon: Route,
    placeholder: "What is your high-level approach? What methods or techniques will you use?",
    hint: "Outline your strategy - you can refine it as you create hypotheses and experiments.",
    type: "textarea" as const,
  },
  {
    name: "timeline",
    label: "Timeline",
    icon: Clock,
    placeholder: "e.g., 3 months: Month 1 - data collection, Month 2 - experiments, Month 3 - paper",
    hint: "A rough timeline helps track progress. Don't worry about being exact.",
    type: "text" as const,
  },
];

export function NewProjectForm({ open, onClose, onSubmit }: NewProjectFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0 = basics, 1 = template

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
    <Dialog open={open} onOpenChange={() => { onClose(); setStep(0); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-violet-500" />
            New Research Project
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            step === 0 ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
          }`}>
            <FileText className="w-3 h-3" />
            Basics
          </div>
          <div className="w-6 h-[1px] bg-gray-200" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            step === 1 ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
          }`}>
            <Target className="w-3 h-3" />
            Research Template
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project Name *</label>
              <Input
                value={values.name || ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g., Physics World Models for Robotic Manipulation"
                className="text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Brief Description</label>
              <Textarea
                value={values.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="One-paragraph summary of the research project"
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSubmit}
                  disabled={!canProceed || loading}
                >
                  Skip Template & Create
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  disabled={!canProceed}
                >
                  Fill Research Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Define the research scope. These fields help you stay focused and make it easier
              to track progress. All fields are optional.
            </p>

            {TEMPLATE_FIELDS.map((field) => (
              <div key={field.name} className="group">
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <field.icon className="w-4 h-4 text-violet-500" />
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={values[field.name] || ""}
                    onChange={(e) => set(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={values[field.name] || ""}
                    onChange={(e) => set(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
                  {field.hint}
                </p>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
