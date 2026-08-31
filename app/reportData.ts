export type Measurement = {
  label: string;
  value: string;
  unit: string;
  min?: number;
  max?: number;
  status?: "Normal" | "Abnormal" | "High" | "Low";
  isAbnormal?: boolean;
  remark?: string;
  category?: "motor" | "air" | "water" | "other" | string;
  phase?: "R" | "Y" | "B" | "Avg" | "R-Y" | "Y-B" | "B-R" | "General";
};

export type ChecklistResult = {
  section?: string;
  item: string;
  result: "YES" | "NO" | "N/A";
  remark: string;
};

export type ServiceImageStage = "before" | "during" | "after" | "general";

export type ServiceImage = {
  id: string;
  name: string;
  caption: string;
  equipmentId: string | null;
  stage?: ServiceImageStage;
  dataUrl: string;
  sizeBytes: number;
};

export type SparePartItem = {
  id: string;
  description: string;
  qty: string;
  remarks: string;
};

export type SignatureMode =
  | "individual"
  | "selected_today"
  | "category_summary"
  | "overall"
  | "no_signature";

export type EquipmentService = {
  id: string;
  name: string;
  tagNo?: string;
  type: string;
  category?: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  room?: string;
  capacity?: string;
  motorType?: "Single Phase" | "Three Phase";
  voltageFrequency?: string;
  installDate?: string;
  assetNo?: string;
  maintenanceFrequency?:
    | "Monthly"
    | "Bi-Monthly"
    | "Quarterly"
    | "Half-Yearly"
    | "Yearly";
  runningReportNo?: string;
  checklist: string[];
  checklistResults?: ChecklistResult[];
  measurements: Measurement[];
  spareParts?: SparePartItem[];
  findings?: string[];
  recommendations?: string[];
  urgentIssues?: string;
  overallCondition?: "Good" | "Satisfactory" | "Unsatisfactory";
  serviceCompleted?: boolean;
  furtherActionRequired?: string;
  nextServiceDue?: string;
  signatureMode?: SignatureMode;
  note: string;
  reviewRequired?: boolean;
  technicianSignature?: {
    name: string;
    signedAt: string;
    dataUrl?: string;
  };
  supervisorSignature?: {
    name: string;
    signedAt: string;
    dataUrl?: string;
  };
  clientSignature?: {
    name: string;
    designation: string;
    signedAt: string;
    dataUrl?: string;
  };
};

export type ServiceReport = {
  id: string;
  client: string;
  siteName?: string;
  buildingArea?: string;
  address: string;
  workOrderNo?: string;
  poNo?: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
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
  findings?: string[];
  recommendations?: string[];
  urgentIssues?: string;
  spareParts?: SparePartItem[];
  overallCondition?: "Good" | "Satisfactory" | "Unsatisfactory";
  serviceCompleted?: boolean;
  furtherActionRequired?: string;
  nextServiceDue?: string;
  signatureMode?: SignatureMode;
  remarks: string;
  followUp: string;
  technicians: string[];
  supervisorName?: string;
  acknowledgement: {
    name: string;
    designation: string;
    signedDate: string;
  };
  equipment: EquipmentService[];
  images: ServiceImage[];
  signature?: {
    signerName: string;
    signerEmail: string;
    designation: string;
    signedAt: string;
    channel: "client_portal" | "admin_device";
    dataUrl: string | null;
    consentText: string;
  } | null;
  technicianSignature?: {
    name: string;
    signedAt: string;
    dataUrl?: string;
  };
  supervisorSignature?: {
    name: string;
    signedAt: string;
    dataUrl?: string;
  };
};

export type CompanyProfile = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  registration: string;
  accreditations?: string[];
};

export const company: CompanyProfile = {
  name: "PROMACH PTE. LTD.",
  address:
    "8 Temasek Boulevard, Level 42, Suntec Tower Three, Singapore-038988",
  phone: "6829 2136",
  email: "enquiry@promachpl.com",
  website: "www.promachpl.com",
  registration: "Company REG/GST No: 202008249W",
  accreditations: [
    "BCA Registered Contractor",
    "bizSAFE STAR",
    "ISO 9001",
    "ISO 14001",
    "ISO 45001",
    "ISO 37001",
  ],
};

export const fcuChecklistItems: ChecklistResult[] = [
  { section: "A. GENERAL CHECKS", item: "Unit condition clean and good", result: "YES", remark: "Good" },
  { section: "A. GENERAL CHECKS", item: "Filter condition clean and good", result: "YES", remark: "Clean" },
  { section: "A. GENERAL CHECKS", item: "Cooling coil clean", result: "YES", remark: "Dry & clean" },
  { section: "A. GENERAL CHECKS", item: "Drain pan clean and no blockage", result: "YES", remark: "No blockage" },
  { section: "A. GENERAL CHECKS", item: "Drain line flow test", result: "YES", remark: "Flow OK" },
  { section: "A. GENERAL CHECKS", item: "Fan blades clean and balanced", result: "YES", remark: "Balanced" },
  { section: "B. ELECTRICAL CHECKS", item: "Motor condition clean and good", result: "YES", remark: "No vibration" },
  { section: "B. ELECTRICAL CHECKS", item: "Electrical connections tight", result: "YES", remark: "All tight" },
  { section: "C. OPERATION CHECKS", item: "Insulation normal", result: "YES", remark: "Normal" },
  { section: "D. SAFETY CHECKS", item: "Overall operation satisfactory", result: "YES", remark: "Satisfactory" },
];

export const ahuChecklistItems: ChecklistResult[] = [
  { section: "A. GENERAL CHECKS", item: "Filter condition clean and good", result: "YES", remark: "Good" },
  { section: "A. GENERAL CHECKS", item: "Cooling coil clean and good", result: "YES", remark: "Clean" },
  { section: "A. GENERAL CHECKS", item: "Drain pan clean and no blockage", result: "YES", remark: "No blockage" },
  { section: "A. GENERAL CHECKS", item: "Condensate drain flow test", result: "YES", remark: "Flow OK" },
  { section: "A. GENERAL CHECKS", item: "Fan / Blower clean and balanced", result: "YES", remark: "Balanced" },
  { section: "B. ELECTRICAL CHECKS", item: "Motor condition clean and good", result: "YES", remark: "Good" },
  { section: "B. ELECTRICAL CHECKS", item: "Belt / Coupling condition", result: "YES", remark: "Good" },
  { section: "B. ELECTRICAL CHECKS", item: "Vibration normal", result: "YES", remark: "Normal" },
  { section: "C. OPERATION CHECKS", item: "Electrical connections tight", result: "YES", remark: "All tight" },
  { section: "D. SAFETY CHECKS", item: "Overall operation satisfactory", result: "YES", remark: "Satisfactory" },
];

export const cracChecklistItems: ChecklistResult[] = [
  { section: "A. UNIT GENERAL", item: "Unit operating normally, no abnormal noise / vibration", result: "YES", remark: "Normal" },
  { section: "A. UNIT GENERAL", item: "No water leakage / refrigerant leak", result: "YES", remark: "No leakage" },
  { section: "A. UNIT GENERAL", item: "Unit casing, panels & door in good condition", result: "YES", remark: "Good" },
  { section: "B. FILTER SECTION", item: "Return air filter clean and in good condition", result: "YES", remark: "Cleaned" },
  { section: "B. FILTER SECTION", item: "Filter properly installed and sealed", result: "YES", remark: "Sealed" },
  { section: "C. AIR HANDLING SECTION", item: "Evaporator coil clean (visual inspection)", result: "YES", remark: "Clean" },
  { section: "C. AIR HANDLING SECTION", item: "Condensate drain pan clean", result: "YES", remark: "Cleaned" },
  { section: "D. FAN SECTION", item: "Supply fan(s) operating smoothly", result: "YES", remark: "Smooth" },
  { section: "E. REFRIGERATION SYSTEM", item: "Compressor(s) operating normally", result: "YES", remark: "Normal" },
  { section: "F. ELECTRICAL SYSTEM", item: "All electrical connections tight & contactors in good condition", result: "YES", remark: "Tight" },
  { section: "G. CONTROL & INSTRUMENTATION", item: "Controller display / HMI working normal & alarms not active", result: "YES", remark: "Normal" },
  { section: "H. SAFETY DEVICES", item: "High / Low pressure switches & float switch normal", result: "YES", remark: "Tested normal" },
];

export const sampleFcuMeasurements: Measurement[] = [
  { label: "Fan Motor Current (R)", value: "1.25", unit: "A", min: 1.0, max: 1.8, status: "Normal", category: "motor", phase: "R" },
  { label: "Fan Motor Current (Y)", value: "1.28", unit: "A", min: 1.0, max: 1.8, status: "Normal", category: "motor", phase: "Y" },
  { label: "Fan Motor Current (B)", value: "2.05", unit: "A", min: 1.0, max: 1.8, status: "High", isAbnormal: true, remark: "High current on B Phase. Check motor.", category: "motor", phase: "B" },
  { label: "Average Current", value: "1.53", unit: "A", min: 1.0, max: 1.8, status: "High", category: "motor", phase: "Avg" },
  { label: "Voltage (R-Y)", value: "415", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "R-Y" },
  { label: "Voltage (Y-B)", value: "414", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "Y-B" },
  { label: "Voltage (B-R)", value: "416", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "B-R" },
  { label: "Supply Air Temperature", value: "13.6", unit: "°C", min: 12.0, max: 16.0, status: "Normal", category: "air" },
  { label: "Return Air Temperature", value: "24.8", unit: "°C", min: 22.0, max: 26.0, status: "Normal", category: "air" },
  { label: "Room Temperature", value: "23.7", unit: "°C", min: 22.0, max: 24.0, status: "Normal", category: "air" },
  { label: "Relative Humidity", value: "56.0", unit: "% RH", min: 40, max: 60, status: "Normal", category: "air" },
  { label: "Supply Air Static Pressure", value: "120", unit: "Pa", min: 80, max: 150, status: "Normal", category: "air" },
  { label: "Frequency", value: "50.0", unit: "Hz", min: 49, max: 51, status: "Normal", category: "motor" },
  { label: "Power", value: "0.56", unit: "kW", min: 0.2, max: 1.2, status: "Normal", category: "motor" },
];

export const sampleAhuMeasurements: Measurement[] = [
  { label: "Supply Air Temperature", value: "13.6", unit: "°C", min: 12.0, max: 16.0, status: "Normal", category: "air" },
  { label: "Return Air Temperature", value: "24.8", unit: "°C", min: 22.0, max: 26.0, status: "Normal", category: "air" },
  { label: "Room Temperature", value: "23.7", unit: "°C", min: 22.0, max: 24.0, status: "Normal", category: "air" },
  { label: "Relative Humidity", value: "56.0", unit: "% RH", min: 40, max: 60, status: "Normal", category: "air" },
  { label: "Static Pressure (Supply)", value: "120", unit: "Pa", min: 80, max: 150, status: "Normal", category: "air" },
  { label: "Fan Motor Current (R)", value: "2.8", unit: "A", min: 2.0, max: 3.5, status: "Normal", category: "motor", phase: "R" },
  { label: "Fan Motor Current (Y)", value: "2.6", unit: "A", min: 2.0, max: 3.5, status: "Normal", category: "motor", phase: "Y" },
  { label: "Fan Motor Current (B)", value: "4.2", unit: "A", min: 2.0, max: 3.5, status: "Abnormal", isAbnormal: true, remark: "Fan motor current on Blue phase is high.", category: "motor", phase: "B" },
  { label: "Voltage (R-Y)", value: "409", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "R-Y" },
  { label: "Frequency", value: "49.8", unit: "Hz", min: 49, max: 51, status: "Normal", category: "motor" },
];

export const serviceReports: ServiceReport[] = [
  {
    id: "AHU-2026-0728-0001",
    client: "Tuas Power Generation Pte. Ltd.",
    siteName: "Tuas Power Plant (CCP 5)",
    buildingArea: "Control Building",
    address: "60 Tuas South Avenue 9, Singapore 637607",
    workOrderNo: "WO/TP/2026/0728",
    poNo: "PO/TP/2026/0550",
    date: "28 Jul 2026",
    timeIn: "09:15 AM",
    timeOut: "11:45 AM",
    serviceMonth: "July 2026",
    serviceType: "Quarterly Maintenance",
    status: "Completed",
    condition: "Follow-up required",
    summary: "Quarterly preventive maintenance service for AHU-5-01 CCP 5 Control Building.",
    workPerformed: [
      "Completed quarterly ACMV preventive service.",
      "Cleaned filter media, cooling coil, drain pan and vacuumed drain lines.",
      "Inspected blower motor, belts, bearings, and electrical connections.",
      "Recorded 3-phase running current, voltage, temperature, and static pressure.",
    ],
    findings: [
      "Fan motor current on Blue phase is high (4.2 A vs 3.5 A max).",
      "Noted dust accumulation on return filter.",
    ],
    recommendations: [
      "Monitor motor current during next bi-weekly cycle.",
      "Clean filters regularly according to quarterly schedule.",
    ],
    urgentIssues: "None",
    spareParts: [
      { id: "sp-1", description: "Air Filter (Pre)", qty: "1 No.", remarks: "Replaced" },
      { id: "sp-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
      { id: "sp-3", description: "Belt Dressing", qty: "Applied", remarks: "Lubricated" },
    ],
    overallCondition: "Good",
    serviceCompleted: true,
    furtherActionRequired: "Monitor motor current",
    nextServiceDue: "28 Oct 2026",
    signatureMode: "selected_today",
    remarks: "Quarterly service completed satisfactorily with observation on B-phase motor current.",
    followUp: "Monitor motor current during next visit.",
    technicians: ["Ramesh Kumar", "Arjun Prasad"],
    supervisorName: "Sridhar M.",
    acknowledgement: {
      name: "Mr. Nasir Bin Abdul Majid",
      designation: "Sr Tech Officer (SS), Tuas Power",
      signedDate: "28 Jul 2026",
    },
    equipment: [
      {
        id: "TP-AHU-5-01",
        name: "AHU-CCP 5",
        tagNo: "AHU-5-01",
        type: "Air Handling Unit",
        category: "AHU",
        brand: "TRANE",
        model: "AHU-1860",
        serial: "1860-TR-2019-00123",
        location: "Level 2 - Mechanical Room",
        room: "Mechanical Room L2",
        capacity: "18,000 CMH",
        motorType: "Three Phase",
        voltageFrequency: "380-415 V / 50 Hz",
        installDate: "15-05-2019",
        assetNo: "TP-ACMV-AHU-0501",
        maintenanceFrequency: "Quarterly",
        runningReportNo: "AHU-2026-0728-0001",
        checklist: ahuChecklistItems.map((i) => i.item),
        checklistResults: ahuChecklistItems,
        measurements: sampleAhuMeasurements,
        spareParts: [
          { id: "sp-1", description: "Air Filter (Pre)", qty: "1 No.", remarks: "Replaced" },
          { id: "sp-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
          { id: "sp-3", description: "Belt Dressing", qty: "Applied", remarks: "Lubricated" },
        ],
        findings: [
          "Fan motor current on Blue phase is high.",
          "Noted dust accumulation on return filter.",
        ],
        recommendations: [
          "Monitor motor current.",
          "Clean filters regularly.",
        ],
        urgentIssues: "None",
        overallCondition: "Good",
        serviceCompleted: true,
        furtherActionRequired: "Monitor motor current",
        nextServiceDue: "28 Oct 2026",
        note: "AHU running satisfactory. B-phase current to be monitored.",
      },
    ],
    images: [],
  },
  {
    id: "FCU-2026-0728-0001",
    client: "Paragon Shopping Mall",
    siteName: "Paragon Commercial Complex",
    buildingArea: "Main Tower",
    address: "290 Orchard Road, Singapore 238859",
    workOrderNo: "WO-2026-0728-101",
    poNo: "PO-2026-0550",
    date: "28 Jul 2026",
    timeIn: "09:15 AM",
    timeOut: "11:45 AM",
    serviceMonth: "July 2026",
    serviceType: "Monthly Maintenance",
    status: "Completed",
    condition: "Running normally",
    summary: "Monthly preventive maintenance for Fan Coil Unit FCU-101 at Room 101.",
    workPerformed: [
      "Completed regular monthly fan coil servicing.",
      "Cleaned filter, drain pan, fan blower, and cooling coil fins.",
      "Checked electrical terminals, insulation, and running parameters.",
    ],
    findings: ["Fan motor running current on B-phase slightly elevated (2.05 A)."],
    recommendations: ["Check capacitor and wiring on next scheduled service."],
    urgentIssues: "None",
    spareParts: [
      { id: "sp-fcu-1", description: "Capacitor (5uF)", qty: "1 No.", remarks: "Replaced" },
      { id: "sp-fcu-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
    ],
    overallCondition: "Good",
    serviceCompleted: true,
    furtherActionRequired: "Check motor on next visit",
    nextServiceDue: "28 Aug 2026",
    signatureMode: "selected_today",
    remarks: "Monthly service completed. Equipment running normal.",
    followUp: "Routine monthly follow-up.",
    technicians: ["K. Suresh", "Ramesh Kumar"],
    supervisorName: "M. Kumar",
    acknowledgement: {
      name: "Mr. John Tan",
      designation: "Facilities Operations Manager, Paragon",
      signedDate: "28 Jul 2026",
    },
    equipment: [
      {
        id: "PAR-FCU-101",
        name: "FCU-101",
        tagNo: "FCU-101",
        type: "Fan Coil Unit",
        category: "FCU",
        brand: "Daikin",
        model: "FXMQ20PAVE",
        serial: "R123456",
        location: "Level 1 / Room 101",
        room: "Room 101",
        capacity: "2.0 TR",
        motorType: "Three Phase",
        voltageFrequency: "380-415 V / 50 Hz",
        installDate: "10-01-2021",
        assetNo: "ASSET-ACMV-FCU-0001",
        maintenanceFrequency: "Monthly",
        runningReportNo: "FCU-2026-0728-0001",
        checklist: fcuChecklistItems.map((i) => i.item),
        checklistResults: fcuChecklistItems,
        measurements: sampleFcuMeasurements,
        spareParts: [
          { id: "sp-fcu-1", description: "Capacitor (5uF)", qty: "1 No.", remarks: "Replaced" },
          { id: "sp-fcu-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
        ],
        findings: ["High current on B Phase (2.05 A)."],
        recommendations: ["Check motor condition and bearings on next cycle."],
        overallCondition: "Good",
        serviceCompleted: true,
        furtherActionRequired: "Check motor",
        nextServiceDue: "28 Aug 2026",
        note: "Drain pan cleaned, coil clean. High current on B phase, need to monitor.",
      },
    ],
    images: [],
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
