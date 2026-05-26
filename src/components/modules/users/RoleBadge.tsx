// src/components/modules/users/RoleBadge.tsx
// Colored badge for each user role.

import { Badge } from "@/components/ui/badge";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: { label: "Super Admin", className: "bg-purple-100 text-purple-700 border-purple-200" },
  ADMIN:       { label: "Admin",       className: "bg-blue-100 text-blue-700 border-blue-200" },
  HR:          { label: "HR",          className: "bg-green-100 text-green-700 border-green-200" },
  TEAM_LEAD:   { label: "Team Lead",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  EMPLOYEE:    { label: "Employee",    className: "bg-slate-100 text-slate-600 border-slate-200" },
  ACCOUNTANT:  { label: "Accountant",  className: "bg-orange-100 text-orange-700 border-orange-200" },
};

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? { label: role, className: "bg-slate-100 text-slate-600" };
  return (
    <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
