"use client";

import {
  UserPlus, Building2, Folder, Users, Palette,
  User, Briefcase, FileText,
} from "lucide-react";

interface CategoryBadgeProps { category: string; }

const CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  bg: string;
  color: string;
}> = {
  lead:     { icon: UserPlus,   label: "Lead",     bg: "rgba(59,130,246,0.15)",  color: "#3b82f6" },
  client:   { icon: Building2,  label: "Client",   bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  project:  { icon: Folder,     label: "Project",  bg: "rgba(20,184,166,0.15)", color: "#14b8a6" },
  meeting:  { icon: Users,      label: "Meeting",  bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  branding: { icon: Palette,    label: "Branding", bg: "rgba(236,72,153,0.15)", color: "#ec4899" },
  personal: { icon: User,       label: "Personal", bg: "rgba(107,114,128,0.15)",color: "#6b7280" },
  business: { icon: Briefcase,  label: "Business", bg: "rgba(99,102,241,0.15)", color: "#6366f1" },
  other:    { icon: FileText,   label: "Other",    bg: "rgba(100,116,139,0.15)",color: "#64748b" },
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const cfg = CONFIG[category] ?? CONFIG["other"];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
