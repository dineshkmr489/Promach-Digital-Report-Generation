export type Measurement = {
  label: string;
  value: string;
  unit: string;
};

export type ChecklistResult = {
  item: string;
  result: "YES" | "NO" | "N/A";
  remark: string;
};

export type EquipmentService = {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  checklist: string[];
  checklistResults?: ChecklistResult[];
  measurements: Measurement[];
  note: string;
  reviewRequired?: boolean;
};

export type ServiceReport = {
  id: string;
  client: string;
  address: string;
  date: string;
  serviceMonth: string;
  serviceType: string;
  status:
    | "Draft"
    | "Awaiting client signature"
    | "Correction required"
    | "Completed"
    | "Cancelled";
  condition: "Running normally" | "Follow-up required";
  summary: string;
  workPerformed: string[];
  remarks: string;
  followUp: string;
  technicians: string[];
  acknowledgement: {
    name: string;
    designation: string;
    signedDate: string;
    source: string;
  };
  equipment: EquipmentService[];
  sourceDocument?: {
    label: string;
    href: string;
    pages: string;
    thumbnail: string;
  };
  transcriptionNotes: string[];
  signature?: {
    signerName: string;
    signerEmail: string;
    designation: string;
    signedAt: string;
    channel: "client_portal" | "admin_device" | "source_document";
    dataUrl: string | null;
    consentText: string;
  } | null;
};

export const company = {
  name: "PROMACH PTE. LTD.",
  address:
    "8 Temasek Boulevard Level 42, Suntec Tower Three, Singapore-038988",
  phone: "6829 2136",
  email: "enquiry@promachpl.com",
  website: "www.promachpl.com",
  registration: "Company UEN / GST No: 202008249W",
};

const airCurtainChecklist = [
  "Check blower motor for proper function",
  "Wipe down housing exterior to remove dust and grime",
  "Clean fan blowers thoroughly and remove dust from blades",
  "Check fan balance and rotation for smooth operation",
  "Vacuum and flush the condensate drain line",
  "Test controller responsiveness and communication with the air curtain unit",
];

const ahuChecklist = [
  "Check filter manometer and replace filter if necessary",
  "Change air filter, filter frames and AHU frame slot",
  "Flush cooling coil with water and comb dented fins",
  "Clean fan motor, impeller, fan scroll and blower blade",
  "Check and ensure chilled water actuator function",
  "Clean dust from AHU housing, piping and ducts",
  "Carry out housekeeping within the surrounding AHU room",
  "Lubricate fan and motor bearing; clean grime and hardened grease from housings",
];

const preCoolChecklist = [
  "Wash filter media and frames; clean filter slot",
  "Check coil face and comb coil fins if necessary",
  "Check and clean the blowers",
  "Check for abnormal noise while the unit is running",
  "Clean condensate tray and remove sludge; replace anti-fungi tablet in drain pan",
  "Vacuum and clean the condensate drain line",
  "Check and record the off-coil temperature",
  "Check thermostat settings",
];

export const serviceReports: ServiceReport[] = [
  {
    id: "4122",
    client: "Changi General Hospital",
    address: "Level 1 Pharmacy, MB Building",
    date: "18 Jul 2026",
    serviceMonth: "July 2026",
    serviceType: "Not marked on source form",
    status: "Completed",
    condition: "Follow-up required",
    summary:
      "Monthly service for the Level 2 AHU, one pre-cool unit and four air curtain units at the Level 1 Pharmacy entrance and exit.",
    workPerformed: [
      "Completed the monthly preventive service.",
      "Serviced the Level 2 AHU and recorded running-current and megger readings.",
      "Serviced one pre-cool unit inside the Level 2 AHU room.",
      "Serviced two air curtains at the Pharmacy entrance and two at the Pharmacy exit.",
    ],
    remarks:
      "This month's service was completed. The pre-cool unit coil is dirty/choked and requires a chemical wash.",
    followUp: "Arrange chemical washing for the pre-cool unit coil.",
    technicians: ["Kabilan", "Manimuthu"],
    acknowledgement: {
      name: "Customer name not legible on source scan",
      designation: "Changi General Hospital Representative",
      signedDate: "18 Jul 2026",
      source: "Signed on original paper report",
    },
    equipment: [
      {
        id: "CGH-AHU-L2-10",
        name: "AHU-L2-10",
        type: "Air Handling Unit",
        brand: "Daikin",
        model: "DMTB-1421B (?)",
        serial: "Not recorded",
        location: "Level 2 AHU Room",
        checklist: ahuChecklist,
        measurements: [
          { label: "R-phase current", value: "5.3", unit: "A" },
          { label: "Y-phase current", value: "5.5", unit: "A" },
          { label: "B-phase current", value: "5.2", unit: "A" },
          { label: "R-phase megger", value: "5.1", unit: "MOhm" },
          { label: "Y-phase megger", value: "5.6", unit: "MOhm" },
          { label: "B-phase megger", value: "5.2", unit: "MOhm" },
        ],
        note: "AHU running is normal.",
        reviewRequired: true,
      },
      {
        id: "CGH-PFCU-L2-3-1",
        name: "PFCU-L2-3-1",
        type: "Pre-cool Unit",
        brand: "Daikin",
        model: "EU000 (?)",
        serial: "Not recorded",
        location: "Level 2 AHU Room - inside",
        checklist: preCoolChecklist,
        measurements: [
          {
            label: "Off-coil temperature",
            value: "Not recorded",
            unit: "",
          },
        ],
        note: "Coil dirty. Needs chemical wash.",
        reviewRequired: true,
      },
      {
        id: "CGH-AC-01",
        name: "Air Curtain 1",
        type: "Air Curtain",
        brand: "KDK",
        model: "3015UA",
        serial: "25060281",
        location: "Level 1 Pharmacy Entrance",
        checklist: airCurtainChecklist,
        measurements: [],
        note: "Air curtain running is normal.",
      },
      {
        id: "CGH-AC-02",
        name: "Air Curtain 2",
        type: "Air Curtain",
        brand: "KDK",
        model: "3015UA",
        serial: "25060278",
        location: "Level 1 Pharmacy Entrance",
        checklist: airCurtainChecklist,
        measurements: [],
        note: "Air curtain running is normal.",
        reviewRequired: true,
      },
      {
        id: "CGH-AC-03",
        name: "Air Curtain 3",
        type: "Air Curtain",
        brand: "KDK",
        model: "3015UA",
        serial: "25060277",
        location: "Level 1 Pharmacy Exit - near",
        checklist: airCurtainChecklist,
        measurements: [],
        note: "Air curtain running is normal.",
      },
      {
        id: "CGH-AC-04",
        name: "Air Curtain 4",
        type: "Air Curtain",
        brand: "KDK",
        model: "3015UA",
        serial: "25060278",
        location: "Level 1 Pharmacy Exit - near",
        checklist: airCurtainChecklist,
        measurements: [],
        note: "Air curtain running is normal.",
        reviewRequired: true,
      },
    ],
    sourceDocument: {
      label: "9-page Changi General Hospital scan",
      href: "/source-documents/changi-general-hospital-july-2026.pdf",
      pages: "Pages 1-9",
      thumbnail: "/source-documents/changi-scan-preview.png",
    },
    transcriptionNotes: [
      "The customer-name line is blank; Changi General Hospital is written in the address/location fields.",
      "The handwritten AHU and pre-cool model characters are partially unclear and are marked with (?).",
      "Serial number 25060278 appears for both Air Curtain 2 and Air Curtain 4 in the source pages; confirm the second entry before production use.",
      "The customer representative signed the source, but the handwritten name is not reliably legible.",
    ],
  },
  {
    id: "3930",
    client: "Tuas Power Generation Pte. Ltd.",
    address: "60 Tuas South Avenue 9, Singapore 637607",
    date: "17 Jul 2026",
    serviceMonth: "July 2026",
    serviceType: "Not marked on source form",
    status: "Completed",
    condition: "Running normally",
    summary:
      "DLP Service No. 6 for DX AHU-15 at the Fan Control Building.",
    workPerformed: [
      "Checked blower bearing and pulley.",
      "Washed AHU filters and vacuumed the filters.",
      "Cleaned the drain tray and vacuumed the drain.",
      "Checked AHU damper operation.",
      "Checked the outdoor unit and completed the service wash.",
    ],
    remarks: "No remarks were entered on the source report.",
    followUp: "No follow-up recorded.",
    technicians: ["Karthi (?)", "Arun", "Marimuthu (?)"],
    acknowledgement: {
      name: "Nasir Bin Abdul Majid",
      designation: "Sr Tech Officer (SS)",
      signedDate: "23 Jul 2026",
      source: "Signed on original paper report",
    },
    equipment: [
      {
        id: "TPG-DX-AHU-15",
        name: "DX AHU-15",
        type: "Air Handling Unit",
        brand: "Not recorded",
        model: "Not recorded",
        serial: "Not recorded",
        location: "Fan Control Building",
        checklist: [
          "Check blower bearing and pulley",
          "Wash AHU filters and vacuum filters",
          "Clean drain tray and vacuum drain",
          "Check AHU damper operation",
          "Check outdoor unit and complete service wash",
        ],
        measurements: [
          { label: "AHU average current", value: "29.02", unit: "A" },
          { label: "CU average current", value: "31.30", unit: "A" },
        ],
        note: "Service completed and acknowledged by the customer.",
      },
    ],
    sourceDocument: {
      label: "Tuas Power service report image",
      href: "/source-documents/tuas-power-service-report-3930.jpg",
      pages: "Single image",
      thumbnail: "/source-documents/tuas-power-service-report-3930.jpg",
    },
    transcriptionNotes: [
      "The Regular Service, Warranty Service and Complaints boxes are all unmarked.",
      "The first and third technician names are handwritten and have been transcribed as Karthi and Marimuthu with review markers.",
      "One handwritten work-description line is partially unclear; the application keeps a conservative normalized transcription.",
      "The report date is 17 Jul 2026; the customer acknowledgement is dated 23 Jul 2026.",
    ],
  },
];

export const allEquipment = serviceReports.flatMap((report) =>
  report.equipment.map((equipment) => ({
    ...equipment,
    client: report.client,
    reportId: report.id,
    serviceDate: report.date,
  })),
);

export const sourceDocuments = serviceReports.map((report) => ({
  reportId: report.id,
  client: report.client,
  ...report.sourceDocument!,
  noteCount: report.transcriptionNotes.length,
}));
