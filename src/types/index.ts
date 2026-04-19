// src/types/index.ts
// Shared TypeScript interfaces mirroring the backend Prisma models.

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Client {
  id: number;
  uuid: string;
  companyName: string;
  contactPerson: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  status: string;
  contractType: string;
  monthlyFee?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  services?: string[] | null;
  notes?: string | null;
  assignedTo?: number | null;
  createdBy?: number;
  createdAt: string;
  updatedAt?: string;
  // computed fields from list endpoint
  assignedToName?: string | null;
  activeTasks?: number;
  daysUntilRenewal?: number | null;
}

export interface ClientCredential {
  id: number;
  clientId: number;
  platform: string;
  username?: string | null;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface ClientDocument {
  id: number;
  clientId: number;
  name: string;
  filePath: string;
  fileType: string;
  uploadedBy: number;
  createdAt: string;
}

export interface ClientDetail extends Client {
  credentials: ClientCredential[];
  documents: ClientDocument[];
  tasks: Array<{
    id: number;
    uuid: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    createdAt: string;
    assignedTo?: { id: number; name: string } | null;
  }>;
  assignedUser?: { id: number; name: string; email: string } | null;
}

export interface Employee {
  id: number;
  uuid: string;
  userId: number;
  employeeCode: string;
  department?: string | null;
  designation?: string | null;
  joiningDate: string;
  shiftStart: string;
  shiftEnd: string;
  baseSalary: number;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  panNumber?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
    status?: string;
  };
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  docType: string;
  name: string;
  filePath: string;
  uploadedBy: number;
  createdAt: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  year: number;
  casualTotal: number;
  casualUsed: number;
  sickTotal: number;
  sickUsed: number;
  paidTotal: number;
  paidUsed: number;
  compOff: number;
}

export interface EmployeeDetail extends Employee {
  documents: EmployeeDocument[];
  leaveBalance: LeaveBalance | null;
}

export interface Task {
  id: number;
  uuid: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  clientId?: number | null;
  assignedToId?: number | null;
  assignedById: number;
  parentTaskId?: number | null;
  createdAt: string;
  updatedAt?: string;
  // populated by list/get endpoints
  assignedTo?: { id: number; name: string; avatarUrl?: string | null } | null;
  assignedBy?: { id: number; name: string } | null;
  client?:     { id: number; uuid: string; companyName: string } | null;
  _count?:     { comments: number };
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  body: string;
  createdAt: string;
  user: { id: number; name: string; avatarUrl?: string | null };
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  filePath: string;
  fileName: string;
  uploadedBy: number;
  createdAt: string;
}

export interface TaskDetail extends Task {
  subTasks: Array<{
    id: number; uuid: string; title: string; status: string; priority: string;
    assignedTo?: { id: number; name: string; avatarUrl?: string | null } | null;
  }>;
  comments: TaskComment[];
  attachments: TaskAttachment[];
}

export interface AttendanceLog {
  id: number;
  employeeId: number;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  type: string;
  lateMinutes: number;
  earlyOutMinutes: number;
  overtimeMinutes: number;
  workMinutes?: number | null;
  notes?: string | null;
  isManual: boolean;
  createdAt: string;
  // populated in team endpoint
  employee?: {
    id: number; uuid: string; employeeCode: string;
    user: { id: number; name: string; avatarUrl?: string | null };
  };
}

export interface AttendanceSummary {
  workingDays: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  totalWorkMinutes: number;
}

export interface LeaveRequest {
  id: number;
  uuid: string;
  employeeId: number;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string | null;
  status: string;
  reviewedBy?: number | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  // populated in HR endpoints
  employee?: {
    id: number; uuid: string; employeeCode: string;
    user: { id: number; name: string; email?: string; avatarUrl?: string | null };
    leaveBalances?: LeaveBalance[];
  };
}

export interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  lateDeduction: number;
  overtimeAmount: number;
  bonus: number;
  otherDeduction: number;
  grossSalary: number;
  netSalary: number;
  status: string;
  paidAt?: string | null;
  payslipPath?: string | null;
  notes?: string | null;
  generatedBy: number;
  createdAt: string;
  employee?: {
    id: number;
    uuid: string;
    employeeCode: string;
    user: { id: number; name: string; email: string; avatarUrl?: string | null };
  };
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: number;
  uuid: string;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  status: string;
  paidAt?: string | null;
  pdfPath?: string | null;
  notes?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt?: string;
  client?: { id: number; uuid: string; companyName: string; email?: string | null };
  lineItems?: InvoiceItem[];
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalCollected: number;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
