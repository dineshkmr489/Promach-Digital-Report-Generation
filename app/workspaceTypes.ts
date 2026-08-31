import type {
  ChecklistResult,
  CompanyProfile,
  EquipmentService,
  Measurement,
  ServiceImage,
  ServiceReport,
  SignatureMode,
  SparePartItem,
} from "./reportData";

export type ReportStatus =
  | "Draft"
  | "Awaiting client signature"
  | "Correction required"
  | "Completed"
  | "Cancelled";

export type SignatureChannel =
  | "client_portal"
  | "admin_device";

export type UserRole =
  | "Administrator"
  | "Operations Manager"
  | "Service Technician"
  | "Viewer";

export type UserRecord = {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserMutationPayload = {
  username: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: UserRole;
  active: boolean;
  password?: string;
};

export type ProfileMutationPayload = {
  name: string;
  email: string;
  phone: string;
  designation: string;
  currentPassword?: string;
  newPassword?: string;
};

export type MasterEntity =
  | "clients"
  | "locations"
  | "equipment"
  | "checklist-templates"
  | "technicians"
  | "service-types";

export type ClientRecord = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
};

export type LocationRecord = {
  id: string;
  clientId: string;
  name: string;
  address: string;
  building?: string;
  room?: string;
  active: boolean;
};

export type ChecklistTemplateRecord = {
  id: string;
  name: string;
  equipmentType: string;
  frequency?: string;
  items: string[];
  measurements: Array<{ label: string; unit: string; min?: number; max?: number; category?: string }>;
  active: boolean;
};

export type EquipmentRecord = {
  id: string;
  clientId: string;
  locationId: string;
  name: string;
  tagNo?: string;
  type: string;
  category?: string;
  brand: string;
  model: string;
  serial: string;
  room?: string;
  capacity?: string;
  motorType?: "Single Phase" | "Three Phase";
  voltageFrequency?: string;
  installDate?: string;
  assetNo?: string;
  maintenanceFrequency?: string;
  checklistTemplateId: string;
  active: boolean;
};

export type TechnicianRecord = {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  active: boolean;
};

export type ServiceTypeRecord = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

export type DigitalSignature = {
  signerName: string;
  signerEmail: string;
  designation: string;
  signedAt: string;
  channel: SignatureChannel;
  dataUrl: string | null;
  consentText: string;
};

export type AuditEvent = {
  id: string;
  reportId: string;
  action: string;
  actorName: string;
  channel: string;
  createdAt: string;
  detail: string;
};

export type WorkspaceReport = Omit<ServiceReport, "status"> & {
  status: ReportStatus;
  clientId: string;
  locationId: string;
  technicianIds: string[];
  createdAt: string;
  sentAt: string | null;
  signature: DigitalSignature | null;
  auditTrail: AuditEvent[];
};

export type WorkspaceSnapshot = {
  company: CompanyProfile;
  clients: ClientRecord[];
  locations: LocationRecord[];
  equipment: EquipmentRecord[];
  checklistTemplates: ChecklistTemplateRecord[];
  technicians: TechnicianRecord[];
  serviceTypes: ServiceTypeRecord[];
  reports: WorkspaceReport[];
};

export type CreateReportPayload = {
  clientId: string;
  locationId: string;
  serviceDate: string;
  serviceType: string;
  timeIn?: string;
  timeOut?: string;
  summary: string;
  workPerformed: string[];
  equipmentIds: string[];
  checklistResults: Record<string, ChecklistResult[]>;
  measurements: Record<string, Measurement[]>;
  equipmentNotes: Record<string, string>;
  spareParts?: Record<string, SparePartItem[]>;
  findings?: string[];
  recommendations?: string[];
  urgentIssues?: string;
  overallCondition?: "Good" | "Satisfactory" | "Unsatisfactory";
  serviceCompleted?: boolean;
  furtherActionRequired?: string;
  nextServiceDue?: string;
  signatureMode?: SignatureMode;
  images: ServiceImage[];
  technicianIds: string[];
  technicianSignature?: { name: string; signedAt: string; dataUrl?: string };
  supervisorSignature?: { name: string; signedAt: string; dataUrl?: string };
  remarks: string;
  followUp: string;
};

export type ClientReportResponse = {
  report: WorkspaceReport;
  company: CompanyProfile;
};

export type ReportEquipmentSnapshot = EquipmentService;
