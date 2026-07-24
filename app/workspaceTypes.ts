import type {
  ChecklistResult,
  EquipmentService,
  Measurement,
  ServiceReport,
} from "./reportData";

export type ReportStatus =
  | "Draft"
  | "Awaiting client signature"
  | "Correction required"
  | "Completed"
  | "Cancelled";

export type SignatureChannel =
  | "client_portal"
  | "admin_device"
  | "source_document";

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
  active: boolean;
};

export type ChecklistTemplateRecord = {
  id: string;
  name: string;
  equipmentType: string;
  items: string[];
  measurements: Array<{ label: string; unit: string }>;
  active: boolean;
};

export type EquipmentRecord = {
  id: string;
  clientId: string;
  locationId: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serial: string;
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
  summary: string;
  workPerformed: string[];
  equipmentIds: string[];
  checklistResults: Record<string, ChecklistResult[]>;
  measurements: Record<string, Measurement[]>;
  equipmentNotes: Record<string, string>;
  technicianIds: string[];
  remarks: string;
  followUp: string;
};

export type ClientReportResponse = {
  report: WorkspaceReport;
  companyName: string;
};

export type ReportEquipmentSnapshot = EquipmentService;
