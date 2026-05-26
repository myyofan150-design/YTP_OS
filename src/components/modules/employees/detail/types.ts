import type { EmployeeDetail } from "@/types";

export interface DetailTabProps {
  employee: EmployeeDetail;
  uuid: string;
  refetch: () => void;
  canEdit: boolean;      // HR_ROLES: HR, ADMIN, SUPER_ADMIN
  canSeeFin: boolean;    // FIN_ROLES: HR, ADMIN, SUPER_ADMIN, ACCOUNTANT
  isAdmin: boolean;      // SUPER_ADMIN | ADMIN only
  userRole: string;
  apiBase: string;
}

export function fmt(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtMoney(n?: number | string | null) {
  if (n == null || n === "") return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}
