import { serviceReports } from "./reportData";
import type {
  AuditEvent,
  ChecklistTemplateRecord,
  ClientRecord,
  EquipmentRecord,
  LocationRecord,
  TechnicianRecord,
  WorkspaceReport,
  WorkspaceSnapshot,
} from "./workspaceTypes";

const clients: ClientRecord[] = [
  {
    id: "client-cgh",
    name: "Changi General Hospital",
    contactName: "Not recorded",
    email: "",
    phone: "",
    address: "2 Simei Street 3, Singapore 529889",
    active: true,
  },
  {
    id: "client-tuas-power",
    name: "Tuas Power Generation Pte. Ltd.",
    contactName: "Nasir Bin Abdul Majid",
    email: "",
    phone: "",
    address: "60 Tuas South Avenue 9, Singapore 637607",
    active: true,
  },
];

const locations: LocationRecord[] = [
  {
    id: "location-cgh-pharmacy",
    clientId: "client-cgh",
    name: "MB Building - Pharmacy",
    address: "Level 1 Pharmacy, MB Building",
    active: true,
  },
  {
    id: "location-tuas-fcb",
    clientId: "client-tuas-power",
    name: "Fan Control Building",
    address: "60 Tuas South Avenue 9, Singapore 637607",
    active: true,
  },
];

const checklistTemplates: ChecklistTemplateRecord[] = [
  {
    id: "template-ahu-cgh",
    name: "AHU preventive service",
    equipmentType: "Air Handling Unit",
    items: serviceReports[0].equipment[0].checklist,
    measurements: serviceReports[0].equipment[0].measurements.map(
      ({ label, unit }) => ({ label, unit }),
    ),
    active: true,
  },
  {
    id: "template-precool",
    name: "Pre-cool unit service",
    equipmentType: "Pre-cool Unit",
    items: serviceReports[0].equipment[1].checklist,
    measurements: serviceReports[0].equipment[1].measurements.map(
      ({ label, unit }) => ({ label, unit }),
    ),
    active: true,
  },
  {
    id: "template-air-curtain",
    name: "Air curtain service",
    equipmentType: "Air Curtain",
    items: serviceReports[0].equipment[2].checklist,
    measurements: [],
    active: true,
  },
  {
    id: "template-dx-ahu",
    name: "DX AHU DLP service",
    equipmentType: "Air Handling Unit",
    items: serviceReports[1].equipment[0].checklist,
    measurements: serviceReports[1].equipment[0].measurements.map(
      ({ label, unit }) => ({ label, unit }),
    ),
    active: true,
  },
];

function templateForEquipment(id: string): string {
  if (id === "CGH-AHU-L2-10") return "template-ahu-cgh";
  if (id === "CGH-PFCU-L2-3-1") return "template-precool";
  if (id === "TPG-DX-AHU-15") return "template-dx-ahu";
  return "template-air-curtain";
}

const equipment: EquipmentRecord[] = serviceReports.flatMap(
  (report, reportIndex) =>
    report.equipment.map((item) => ({
      id: item.id,
      clientId: reportIndex === 0 ? "client-cgh" : "client-tuas-power",
      locationId:
        reportIndex === 0 ? "location-cgh-pharmacy" : "location-tuas-fcb",
      name: item.name,
      type: item.type,
      brand: item.brand,
      model: item.model,
      serial: item.serial,
      checklistTemplateId: templateForEquipment(item.id),
      active: true,
    })),
);

const technicianSeed = [
  ["tech-kabilan", "Kabilan"],
  ["tech-manimuthu", "Manimuthu"],
  ["tech-karthi", "Karthi (?)"],
  ["tech-arun", "Arun"],
  ["tech-marimuthu", "Marimuthu (?)"],
] as const;

const technicians: TechnicianRecord[] = technicianSeed.map(([id, name]) => ({
  id,
  name,
  designation: "Service Technician",
  email: "",
  phone: "",
  active: true,
}));

function technicianId(name: string): string {
  return (
    technicianSeed.find(([, technicianName]) => technicianName === name)?.[0] ??
    ""
  );
}

function sourceAudit(
  reportId: string,
  date: string,
  actorName: string,
): AuditEvent[] {
  return [
    {
      id: `audit-${reportId}-import`,
      reportId,
      action: "Source report imported",
      actorName: "Promach Admin",
      channel: "source_document",
      createdAt: date,
      detail: "Original signed paper record transcribed into the workspace.",
    },
    {
      id: `audit-${reportId}-signed`,
      reportId,
      action: "Customer acknowledgement recorded",
      actorName,
      channel: "source_document",
      createdAt: date,
      detail: "Signature remains preserved on the supplied source document.",
    },
  ];
}

const reports: WorkspaceReport[] = serviceReports.map((report, index) => {
  const clientId = index === 0 ? "client-cgh" : "client-tuas-power";
  const locationId =
    index === 0 ? "location-cgh-pharmacy" : "location-tuas-fcb";
  const isoDate = index === 0 ? "2026-07-18T00:00:00.000Z" : "2026-07-23T00:00:00.000Z";

  return {
    ...report,
    status: "Completed",
    clientId,
    locationId,
    technicianIds: report.technicians.map(technicianId).filter(Boolean),
    createdAt: isoDate,
    sentAt: null,
    signature: {
      signerName: report.acknowledgement.name,
      signerEmail: "",
      designation: report.acknowledgement.designation,
      signedAt: isoDate,
      channel: "source_document",
      dataUrl: null,
      consentText: "Acknowledged on the original supplied service report.",
    },
    auditTrail: sourceAudit(
      report.id,
      isoDate,
      report.acknowledgement.name,
    ),
  };
});

export function createInitialWorkspace(): WorkspaceSnapshot {
  return {
    clients: clients.map((item) => ({ ...item })),
    locations: locations.map((item) => ({ ...item })),
    equipment: equipment.map((item) => ({ ...item })),
    checklistTemplates: checklistTemplates.map((item) => ({
      ...item,
      items: [...item.items],
      measurements: item.measurements.map((measurement) => ({
        ...measurement,
      })),
    })),
    technicians: technicians.map((item) => ({ ...item })),
    reports: reports.map((report) => ({
      ...report,
      equipment: report.equipment.map((item) => ({
        ...item,
        checklist: [...item.checklist],
        measurements: item.measurements.map((measurement) => ({
          ...measurement,
        })),
      })),
      workPerformed: [...report.workPerformed],
      technicians: [...report.technicians],
      technicianIds: [...report.technicianIds],
      transcriptionNotes: [...report.transcriptionNotes],
      auditTrail: report.auditTrail.map((event) => ({ ...event })),
      signature: report.signature ? { ...report.signature } : null,
    })),
  };
}
