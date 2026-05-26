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
  companyName: string | null;
  logoUrl?: string | null;
  contactPerson: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  clientTag?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  status: string;
  contractType: string;
  monthlyFee?: number | null;
  totalContractValue?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  services?: string[] | null;
  notes?: string | null;
  onHoldReason?: string | null;
  country?: string | null;
  city?: string | null;
  source?: string | null;
  convertedFromLeadId?: number | null;
  lastContacted?: string | null;
  nextFollowup?: string | null;
  meetingDatetime?: string | null;
  assignedTo?: number | null;
  createdBy?: number;
  createdAt: string;
  updatedAt?: string;
  // computed fields from list endpoint
  assignedToName?: string | null;
  activeTasks?: number;
  daysUntilRenewal?: number | null;
  totalPaid?: number;
}

export interface ClientContact {
  id: number;
  uuid: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  role?: string | null;
  isPrimary: number;
  createdAt: string;
}

export interface ClientPayment {
  id: number;
  uuid: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  milestone?: string | null;
  notes?: string | null;
  recordedBy: number;
  createdAt: string;
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
  contacts: ClientContact[];
  payments: { records: ClientPayment[]; totalReceived: number; balancePending: number | null };
  assignedUser?: { id: number; name: string; email: string } | null;
}

export interface EmployeeAddress {
  id?: number;
  flatDoor?: string | null;
  street?: string | null;
  city?: string | null;
  pinCode?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface EmployeeBankDetails {
  id?: number;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  ifscCode?: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  uanNumber?: string | null;
  esicNumber?: string | null;
}

export interface EmergencyContact {
  id?: number;
  contactOrder: number;
  name: string;
  relationship?: string | null;
  phone: string;
  email?: string | null;
}

export interface SalaryComponent {
  id?: number;
  componentType: "earning" | "deduction";
  name: string;
  amount: number;
  isMandatory: boolean;
  isCustom: boolean;
  sortOrder: number;
}

export interface EmployeeAsset {
  id?: number;
  uuid?: string;
  assetName: string;
  assetType?: string | null;
  assignedDate?: string | null;
  returnDate?: string | null;
  serialNumber?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface EmployeeAgreement {
  id?: number;
  uuid?: string;
  agreementType: string;
  name: string;
  filePath?: string | null;
  version?: string | null;
  signedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
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
  // legacy flat bank fields (kept for backward compat)
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  panNumber?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  // extended fields
  personalEmail?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  educationQualification?: string | null;
  schoolCollege?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  bloodGroup?: string | null;
  employeeType?: string | null;
  workMode?: string | null;
  workLocation?: string | null;
  reportingManagerId?: number | null;
  probationEndDate?: string | null;
  confirmationDate?: string | null;
  contractEndDate?: string | null;
  contractRenewalReminder?: number | null;
  ctc?: number | null;
  skillTags?: string[] | null;
  backgroundVerificationStatus?: string | null;
  lastWorkingDate?: string | null;
  exitReason?: string | null;
  exitType?: string | null;
  settlementStatus?: string | null;
  rehireEligible?: boolean | null;
  exitNotes?: string | null;
  user: {
    id: number;
    uuid?: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
    status?: string;
    lastLoginAt?: string | null;
  };
  // sub-records (populated in detail endpoint)
  address?: EmployeeAddress | null;
  bankDetails?: EmployeeBankDetails | null;
  emergencyContacts?: EmergencyContact[];
  salaryComponents?: SalaryComponent[];
  assets?: EmployeeAsset[];
  documents?: EmployeeDocument[];
  agreements?: EmployeeAgreement[];
}

export interface EmployeeDocument {
  id: number;
  docType: string;
  docCategory?: string | null;
  name: string;
  filePath: string;
  isMandatory?: boolean;
  verificationStatus?: "pending" | "verified" | "rejected";
  verifiedAt?: string | null;
  expiryDate?: string | null;
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

export interface StatusHistoryEntry {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  reason?: string | null;
  lastWorkingDate?: string | null;
  exitType?: string | null;
  createdAt: string;
  changedByUser?: { id: number; name: string } | null;
}

export interface EmployeeDetail extends Employee {
  documents: EmployeeDocument[];
  leaveBalance: LeaveBalance | null;
  emergencyContacts: EmergencyContact[];
  salaryComponents: SalaryComponent[];
  assets: EmployeeAsset[];
  agreements: EmployeeAgreement[];
  statusHistory?: StatusHistoryEntry[];
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
  _count?:     { comments: number; attachments?: number; subTasks?: number };
  members?:    Array<{ id: number; name: string; avatarUrl?: string | null }>;
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
  milestone?: string | null;
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

// ─── Subscription Tracker ──────────────────────────────────────────────────────

export interface MetaOption {
  id: number;
  uuid: string;
  type: string;
  label: string;
  color: string;
  sortOrder: number;
}

export interface Subscription {
  id: number;
  uuid: string;
  name: string;
  logoUrl: string | null;
  link: string | null;
  username: string | null;
  startDate: string;
  endDate: string;
  category: MetaOption | null;
  billingCycle: MetaOption | null;
  status: MetaOption | null;
  price: number | null;
  currency: string;
  autopay: boolean;
  remarks: string | null;
  daysLeft: number;
  createdAt: string;
  password?: string | null;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadMetaOption {
  id: number;
  uuid: string;
  type: "source" | "status" | "priority" | "service";
  label: string;
  color: string;
  sortOrder: number;
}

export interface Lead {
  id: number;
  uuid: string;
  contactPerson: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  sourceId: number | null;
  assignedTo: number | null;
  statusId: number | null;
  priorityId: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  requirementDescription: string | null;
  lastContacted: string | null;
  nextFollowup: string | null;
  meetingDatetime: string | null;
  converted: boolean;
  convertedClientId: number | null;
  convertedClientUuid: string | null;
  lostReason: string | null;
  createdAt: string;
  source: LeadMetaOption | null;
  status: LeadMetaOption | null;
  priority: LeadMetaOption | null;
  services: LeadMetaOption[];
  assignedUser: { id: number; uuid: string; name: string; email: string } | null;
}

export interface LeadStats {
  total: number;
  convertedCount: number;
  lostCount: number;
  followupToday: number;
  meetingsToday: number;
  byStatus: Array<{ label: string; color: string; count: number }>;
  byPriority: Array<{ label: string; color: string; count: number }>;
  bySource: Array<{ label: string; color: string; count: number }>;
}

export interface SubscriptionAnalytics {
  totalMonthlySpend: number;
  totalAnnualSpend: number;
  byCategory: Array<{ categoryName: string; color: string | null; total: number; count: number }>;
  byBillingCycle: Array<{ label: string; color: string | null; total: number; count: number }>;
  expiringIn7Days: number;
  expiringIn30Days: number;
  totalActive: number;
}

// ─── Todo Module ───────────────────────────────────────────────────────────────

export type SmartViewType = "today" | "important" | "assigned-to-me" | "overdue" | "completed";
export type TodoPriority  = "none" | "low" | "medium" | "high";
export type TodoStatus    = "pending" | "completed";
export type RepeatType    = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom";

export interface TodoGroup {
  id: number;
  uuid: string;
  name: string;
  color: string;
  sortOrder: number;
  createdBy: number;
  createdAt: string;
  listCount?: number;
}

export interface TodoListMember {
  id: number;
  userUuid: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  addedBy: number;
  addedAt: string;
}

export interface TodoList {
  id: number;
  uuid: string;
  groupId?: number | null;
  name: string;
  color: string;
  icon?: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdBy: number;
  createdAt: string;
  taskCount?: number;
  pendingCount?: number;
  memberCount?: number;
  groupName?: string | null;
  members?: TodoListMember[];
}

export type TodoBgColor = "default" | "mint" | "yellow" | "blue" | "red" | "purple";

export interface TodoTask {
  id: number;
  uuid: string;
  listId?: number | null;
  listUuid?: string | null;
  title: string;
  description?: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  reminderAt?: string | null;
  repeatType?: RepeatType | null;
  repeatConfig?: string | null;
  bgColor?: TodoBgColor | null;
  isFavorite: boolean;
  sortOrder: number;
  createdBy: number;
  assignedTo?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  // populated fields
  creatorName?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assignedByName?: string | null;
  subtaskCount?: number;
  attachmentCount?: number;
  listName?: string | null;
  listColor?: string | null;
  members?: Array<{ id: number; name: string; avatarUrl?: string | null }>;
}

export interface TodoSubtask {
  id: number;
  uuid: string;
  taskId: number;
  title: string;
  status: TodoStatus;
  sortOrder: number;
  createdAt: string;
}

export interface TodoAttachment {
  id: number;
  uuid: string;
  taskId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string | null;
  uploadedBy: number;
  createdAt: string;
}

export interface TodoActivity {
  id: number;
  taskId: number;
  userId: number;
  action: string;
  detail?: string | null;
  createdAt: string;
  userName?: string;
}

export interface TodoTaskDetail extends TodoTask {
  subtasks: TodoSubtask[];
  attachments: TodoAttachment[];
  note?: string | null;
  activity: TodoActivity[];
  assignedUser?: { id: number; name: string; email: string; avatarUrl?: string | null } | null;
}

// ─── Notes Module ─────────────────────────────────────────────────────────────

export interface NoteTag {
  id: number;
  uuid: string;
  name: string;
  color: string;
  createdBy: number;
  noteCount?: number;
}

export interface NoteAttachment {
  id: number;
  uuid: string;
  noteId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export interface NoteMention {
  id: number;
  noteId: number;
  mentionedUserId: number;
  user?: { id: number; name: string; avatarUrl?: string };
}

export interface Note {
  id: number;
  uuid: string;
  title: string;
  content: string;
  category: "lead" | "client" | "project" | "meeting" | "branding" | "personal" | "business" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "archived" | "deleted";
  isStarred: boolean;
  isRead: boolean;
  isSnoozed: boolean;
  snoozedUntil?: string;
  linkedModule: string;
  linkedModuleUuid?: string;
  linkedClientId?: number;
  linkedClient?: { id: number; companyName: string };
  assignedTo?: number;
  assignedUser?: { id: number; name: string; avatarUrl?: string };
  createdBy: number;
  createdByUser?: { name: string; avatarUrl?: string };
  tags: NoteTag[];
  attachments?: NoteAttachment[];
  mentions?: NoteMention[];
  contentExcerpt?: string;
  attachmentCount?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFilters {
  category?: string;
  priority?: string;
  status?: string;
  tagId?: string;
  assignedTo?: string;
  isStarred?: boolean;
  hasAttachments?: boolean;
  linkedModule?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "updated";
  page?: number;
  limit?: number;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatConversationMember {
  userId: number;
  userUuid?: string;
  name?: string;
  avatarUrl?: string | null;
  email?: string;
  role: string;
  memberRole: "admin" | "member";
  isMuted: boolean;
}

export interface ChatConversation {
  id?: number;
  uuid: string;
  type: "direct" | "group" | "contextual";
  name?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  isAnnouncementOnly: boolean;
  isArchived: boolean;
  linkedModule?: string;
  linkedModuleUuid?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount?: number;
  myRole?: "admin" | "member";
  isMuted?: boolean;
  members?: ChatConversationMember[];
  otherUser?: { id: number; uuid: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
}

export interface ChatMessageAttachment {
  id: number;
  uuid: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  downloadCount: number;
}

export interface ChatMessageReaction {
  emoji: string;
  count: number;
  users: number[];
  userReacted: boolean;
}

export interface ChatMessage {
  id: number;
  uuid: string;
  conversationId: number;
  senderId: number;
  type: "text" | "image" | "file" | "system";
  content: string;
  replyToId?: number | null;
  replyTo?: ChatMessage | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  isPinned: boolean;
  reactions?: ChatMessageReaction[];
  attachments?: ChatMessageAttachment[];
  sender?: {
    id: number;
    uuid: string;
    name: string;
    avatarUrl?: string | null;
    role: string;
    email?: string;
  } | null;
  readBy?: number[];
  createdAt: string;
}
