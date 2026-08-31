"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  Pencil,
  QrCode,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type {
  ChecklistResult,
  Measurement,
  ServiceReport,
  SignatureMode,
} from "./reportData";
import { downloadServiceReportPdf } from "./reportPdf";
import type { WorkspaceSnapshot } from "./workspaceTypes";

type ScreenId =
  | "dashboard"
  | "equipment_list"
  | "checklist"
  | "measurements"
  | "other_measurements"
  | "remarks_photos"
  | "signatures"
  | "report_preview"
  | "report_sent";

export function FieldServiceFlow({
  workspace,
  onExitToAdmin,
}: {
  workspace: WorkspaceSnapshot;
  onUpdateWorkspace: (next: WorkspaceSnapshot) => void;
  onExitToAdmin?: () => void;
}) {
  // Navigation & Screen state
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("dashboard");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("location-paragon-main");
  const [serviceMonth, setServiceMonth] = useState<string>("July 2026");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailAddresses, setEmailAddresses] = useState<string>(
    "facilities@paragon.sg, supervisor@promachpl.com"
  );
  const [toastMessage, setToastMessage] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentScreen]);

  // Active Equipment Field Service State
  const [activeEquipmentId, setActiveEquipmentId] = useState<string>("PAR-FCU-101");
  const [measurementSubTab, setMeasurementSubTab] = useState<"motor" | "air" | "water" | "others">("motor");
  const [motorPhase, setMotorPhase] = useState<"single" | "three">("three");

  // Editable state for the ongoing service visit
  const [checklistData, setChecklistData] = useState<ChecklistResult[]>([
    { section: "A. GENERAL CHECKS", item: "Unit condition clean and good", result: "YES", remark: "Good" },
    { section: "A. GENERAL CHECKS", item: "Filter condition clean and good", result: "YES", remark: "Clean" },
    { section: "A. GENERAL CHECKS", item: "Cooling coil clean", result: "YES", remark: "Dry & clean" },
    { section: "A. GENERAL CHECKS", item: "Drain pan clean and no blockage", result: "YES", remark: "No blockage" },
    { section: "A. GENERAL CHECKS", item: "Drain line flow test", result: "YES", remark: "Flow OK" },
    { section: "A. GENERAL CHECKS", item: "Fan / Blower clean and balanced", result: "YES", remark: "Balanced" },
    { section: "B. ELECTRICAL CHECKS", item: "Motor condition clean and good", result: "YES", remark: "No vibration" },
    { section: "B. ELECTRICAL CHECKS", item: "Electrical connections tight", result: "YES", remark: "All tight" },
    { section: "C. OPERATION CHECKS", item: "Insulation normal", result: "YES", remark: "Normal" },
    { section: "D. SAFETY CHECKS", item: "Overall operation satisfactory", result: "YES", remark: "Satisfactory" },
  ]);

  const [measurementsData, setMeasurementsData] = useState<Measurement[]>([
    { label: "Fan Motor Current (R)", value: "1.25", unit: "A", min: 1.0, max: 1.8, status: "Normal", category: "motor", phase: "R" },
    { label: "Fan Motor Current (Y)", value: "1.28", unit: "A", min: 1.0, max: 1.8, status: "Normal", category: "motor", phase: "Y" },
    { label: "Fan Motor Current (B)", value: "2.05", unit: "A", min: 1.0, max: 1.8, status: "High", isAbnormal: true, remark: "High current on B Phase. Check motor.", category: "motor", phase: "B" },
    { label: "Average Current", value: "1.53", unit: "A", min: 1.0, max: 1.8, status: "High", category: "motor", phase: "Avg" },
    { label: "Voltage (R-Y)", value: "415", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "R-Y" },
    { label: "Voltage (Y-B)", value: "414", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "Y-B" },
    { label: "Voltage (B-R)", value: "416", unit: "V", min: 380, max: 420, status: "Normal", category: "motor", phase: "B-R" },
    { label: "Frequency", value: "50.0", unit: "Hz", min: 49, max: 51, status: "Normal", category: "motor" },
    { label: "Power", value: "0.56", unit: "kW", min: 0.2, max: 1.2, status: "Normal", category: "motor" },
    { label: "Room Temperature", value: "23.7", unit: "°C", min: 22.0, max: 24.0, status: "Normal", category: "air" },
    { label: "Room RH", value: "56.0", unit: "%", min: 40, max: 60, status: "Normal", category: "air" },
    { label: "Supply Air Temperature", value: "13.6", unit: "°C", min: 12.0, max: 16.0, status: "Normal", category: "air" },
    { label: "Return Air Temperature", value: "24.8", unit: "°C", min: 22.0, max: 26.0, status: "Normal", category: "air" },
    { label: "Air Velocity", value: "2.8", unit: "m/s", min: 1.5, max: 4.0, status: "Normal", category: "air" },
    { label: "Static Pressure", value: "120", unit: "Pa", min: 80, max: 150, status: "Normal", category: "air" },
  ]);

  const [remarksText, setRemarksText] = useState<string>(
    "Drain pan cleaning done. Coil is clean. High current on B phase, need to monitor."
  );
  const [capturedPhotos, setCapturedPhotos] = useState<
    Array<{ id: string; stage: "before" | "during" | "after"; name: string; url: string }>
  >([
    {
      id: "photo-1",
      stage: "before",
      name: "Before Service Filter",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' fill='%23334155'><rect width='200' height='150' fill='%231e293b'/><text x='100' y='75' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'>Before Service</text></svg>",
    },
    {
      id: "photo-2",
      stage: "during",
      name: "During Coil Cleaning",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' fill='%23334155'><rect width='200' height='150' fill='%231e293b'/><text x='100' y='75' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'>During Cleaning</text></svg>",
    },
    {
      id: "photo-3",
      stage: "after",
      name: "After Service Clean",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' fill='%23334155'><rect width='200' height='150' fill='%231e293b'/><text x='100' y='75' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'>After Service</text></svg>",
    },
  ]);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>("selected_today");
  const [technicianSignature] = useState<string | null>(
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><path d='M10 30 Q 30 10, 60 25 T 110 15' stroke='%230284c7' stroke-width='2' fill='none'/></svg>"
  );
  const [supervisorSignature] = useState<string | null>(
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><path d='M10 20 Q 40 5, 70 30 T 110 10' stroke='%23059669' stroke-width='2' fill='none'/></svg>"
  );
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Selected Equipment metadata
  const activeEquip = useMemo(() => {
    const found = workspace.equipment.find((e) => e.id === activeEquipmentId);
    if (found) return found;
    return {
      id: "PAR-FCU-101",
      clientId: "client-paragon",
      locationId: "location-paragon-main",
      name: "FCU-101",
      tagNo: "FCU-101",
      type: "Fan Coil Unit",
      category: "FCU",
      brand: "Daikin",
      model: "FXMQ20PAVE",
      serial: "R123456",
      room: "Level 1 / Room 101",
      capacity: "2.0 TR",
      motorType: "Three Phase" as const,
      voltageFrequency: "380-415 V / 50 Hz",
      installDate: "2021-01-10",
      assetNo: "ASSET-ACMV-FCU-0001",
      maintenanceFrequency: "Monthly",
      checklistTemplateId: "template-fcu-monthly",
      active: true,
    };
  }, [workspace.equipment, activeEquipmentId]);

  // Selected Site metadata
  const activeSite = useMemo(() => {
    return (
      workspace.locations.find((l) => l.id === selectedSiteId) ||
      workspace.locations[0] || {
        id: "loc-default",
        clientId: "client-paragon",
        name: "Paragon Shopping Mall",
        address: "290 Orchard Road, Singapore 238859",
        building: "Main Tower",
        room: "Level 1",
        active: true,
      }
    );
  }, [workspace.locations, selectedSiteId]);

  const activeClient = useMemo(() => {
    return (
      workspace.clients.find((c) => c.id === activeSite.clientId) ||
      workspace.clients[0] || {
        id: "client-default",
        name: "Paragon Shopping Mall",
        contactName: "Mr. John Tan",
        email: "facilities@paragon.sg",
        phone: "6738 5535",
        address: "290 Orchard Road, Singapore 238859",
        active: true,
      }
    );
  }, [workspace.clients, activeSite]);

  // Equipment filtering
  const siteEquipmentList = useMemo(() => {
    let list = workspace.equipment.filter((e) => e.locationId === selectedSiteId || e.clientId === activeClient.id);
    if (categoryFilter !== "ALL") {
      list = list.filter((e) => (e.category || e.type || "").toUpperCase().includes(categoryFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.tagNo || "").toLowerCase().includes(q) ||
          (e.room || "").toLowerCase().includes(q) ||
          (e.brand || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [workspace.equipment, selectedSiteId, activeClient.id, categoryFilter, searchQuery]);

  // Abnormal items count
  const abnormalMeasurements = useMemo(() => {
    return measurementsData.filter(
      (m) => m.isAbnormal || m.status === "Abnormal" || m.status === "High" || m.status === "Low"
    );
  }, [measurementsData]);

  // Handle equipment selection
  const startServiceForEquipment = (equipId: string) => {
    setActiveEquipmentId(equipId);
    setCurrentScreen("checklist");
    showToast(`Loaded client checklist for ${equipId}`);
  };

  // Toggle checklist item result
  const toggleChecklistResult = (index: number, result: "YES" | "NO" | "N/A") => {
    setChecklistData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], result };
      return updated;
    });
  };

  // Update measurement value and auto-validate limits
  const updateMeasurementValue = (index: number, val: string) => {
    setMeasurementsData((prev) => {
      const updated = [...prev];
      const m = updated[index];
      const numVal = parseFloat(val);
      let isAbnormal = m.isAbnormal;
      let status = m.status;

      if (!isNaN(numVal) && m.min !== undefined && m.max !== undefined) {
        if (numVal < m.min || numVal > m.max) {
          isAbnormal = true;
          status = numVal > m.max ? "High" : "Low";
        } else {
          isAbnormal = false;
          status = "Normal";
        }
      }

      updated[index] = { ...m, value: val, status, isAbnormal };
      return updated;
    });
  };

  // Toggle abnormal status directly (long-press or tap override)
  const toggleAbnormalOverride = (index: number) => {
    setMeasurementsData((prev) => {
      const updated = [...prev];
      const m = updated[index];
      const nextAbnormal = !m.isAbnormal;
      updated[index] = {
        ...m,
        isAbnormal: nextAbnormal,
        status: nextAbnormal ? "Abnormal" : "Normal",
        remark: nextAbnormal ? (m.remark || "Marked abnormal by technician") : "",
      };
      return updated;
    });
    showToast("Status toggled: Normal / Abnormal");
  };

  // Add quick remark suggestion
  const appendQuickSuggestion = (text: string) => {
    setRemarksText((prev) => {
      if (prev.includes(text)) return prev;
      return prev ? `${prev} ${text}.` : `${text}.`;
    });
  };

  // Download PDF Report
  const handleDownloadPdf = async () => {
    const runningNo = `FCU-2026-0728-0001`;
    const reportObj: ServiceReport = {
      id: runningNo,
      client: activeClient.name,
      siteName: activeSite.name,
      buildingArea: activeSite.building || "Main Tower",
      address: activeSite.address,
      workOrderNo: "WO-2026-0728-101",
      poNo: "PO-2026-0550",
      date: "28 Jul 2026",
      timeIn: "09:15 AM",
      timeOut: "11:45 AM",
      serviceMonth,
      serviceType: "Monthly Maintenance",
      status: "Completed",
      condition: abnormalMeasurements.length > 0 ? "Follow-up required" : "Running normally",
      summary: `Monthly preventive maintenance for ${activeEquip.name} at ${activeEquip.room || activeSite.name}.`,
      workPerformed: [
        "Completed regular monthly fan coil servicing.",
        "Cleaned filter, drain pan, fan blower, and cooling coil fins.",
        "Checked electrical terminals, insulation, and running parameters.",
      ],
      findings: abnormalMeasurements.map((m) => `${m.label} reading is ${m.value} ${m.unit} (${m.status}).`),
      recommendations: ["Check motor condition and bearings on next cycle."],
      urgentIssues: "None",
      spareParts: [
        { id: "sp-1", description: "Capacitor (5uF)", qty: "1 No.", remarks: "Replaced" },
        { id: "sp-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
      ],
      overallCondition: "Good",
      serviceCompleted: true,
      furtherActionRequired: abnormalMeasurements.length > 0 ? "Monitor high current" : "None",
      nextServiceDue: "28 Aug 2026",
      signatureMode,
      remarks: remarksText,
      followUp: "Routine monthly follow-up.",
      technicians: ["K. Suresh", "Ramesh Kumar"],
      supervisorName: "M. Kumar",
      acknowledgement: {
        name: activeClient.contactName || "Authorised Representative",
        designation: "Facilities Operations Manager",
        signedDate: "28 Jul 2026",
      },
      equipment: [
        {
          id: activeEquip.id,
          name: activeEquip.name,
          tagNo: activeEquip.tagNo || activeEquip.name,
          type: activeEquip.type,
          category: activeEquip.category || "FCU",
          brand: activeEquip.brand,
          model: activeEquip.model,
          serial: activeEquip.serial,
          location: activeEquip.room || activeSite.address,
          room: activeEquip.room || "Room 101",
          capacity: activeEquip.capacity || "2.0 TR",
          motorType: activeEquip.motorType || "Three Phase",
          voltageFrequency: activeEquip.voltageFrequency || "380-415 V / 50 Hz",
          installDate: activeEquip.installDate || "10-01-2021",
          assetNo: activeEquip.assetNo || "ASSET-ACMV-FCU-0001",
          maintenanceFrequency: "Monthly",
          runningReportNo: runningNo,
          checklist: checklistData.map((c) => c.item),
          checklistResults: checklistData,
          measurements: measurementsData,
          spareParts: [
            { id: "sp-1", description: "Capacitor (5uF)", qty: "1 No.", remarks: "Replaced" },
            { id: "sp-2", description: "Drain Pan Treatment", qty: "1 No.", remarks: "Completed" },
          ],
          findings: abnormalMeasurements.map((m) => `${m.label} is ${m.value} ${m.unit}`),
          recommendations: ["Check motor condition and bearings on next cycle."],
          overallCondition: "Good",
          serviceCompleted: true,
          furtherActionRequired: "Monitor current",
          nextServiceDue: "28 Aug 2026",
          note: remarksText,
        },
      ],
      images: capturedPhotos.map((p) => ({
        id: p.id,
        name: p.name,
        caption: p.name,
        equipmentId: activeEquip.id,
        stage: p.stage,
        dataUrl: p.url,
        sizeBytes: 15000,
      })),
    };

    try {
      await downloadServiceReportPdf(reportObj, workspace.company, null);
      showToast("Singapore Standard PDF Service Report downloaded.");
    } catch {
      showToast("PDF generation failed.");
    }
  };

  return (
    <div className="reference-field-shell flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 md:pb-0">
      {/* Top Mobile/Tablet Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          {currentScreen !== "dashboard" ? (
            <button
              onClick={() => {
                if (currentScreen === "report_preview") setCurrentScreen("signatures");
                else if (currentScreen === "signatures") setCurrentScreen("remarks_photos");
                else if (currentScreen === "remarks_photos") setCurrentScreen("measurements");
                else if (currentScreen === "measurements") setCurrentScreen("checklist");
                else if (currentScreen === "checklist") setCurrentScreen("equipment_list");
                else setCurrentScreen("dashboard");
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="field-brand-mark">
              <Image
                alt="Promach"
                height={30}
                priority
                src="/brand/promach-logo.png"
                width={30}
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-wide">PROMACH PTE. LTD.</span>
              <span className="hidden min-[430px]:inline text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-medium">
                PDMS Aircon
              </span>
            </div>
            <p className="hidden min-[360px]:block text-[11px] text-slate-400">Singapore ACMV Field Service</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm"
          >
            <QrCode size={15} />
            <span className="hidden sm:inline">Scan QR</span>
          </button>
          {onExitToAdmin && (
            <button
              onClick={onExitToAdmin}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Admin Mode</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Screen Router */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5">
        {/* ================================================================ */}
        {/* SCREEN 1: DASHBOARD (SUMMARY) */}
        {/* ================================================================ */}
        {currentScreen === "dashboard" && (
          <div className="space-y-4">
            {/* Top Selector Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-sm">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Site / Location
                </label>
                <div className="relative">
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 appearance-none focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {workspace.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.building || "Main"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Service Month
                </label>
                <div className="relative">
                  <select
                    value={serviceMonth}
                    onChange={(e) => setServiceMonth(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 appearance-none focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="July 2026">July 2026</option>
                    <option value="August 2026">August 2026</option>
                    <option value="September 2026">September 2026</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* KPI Metric Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="col-span-2 sm:col-span-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                <strong className="text-lg font-bold text-white">32</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Not Started</span>
                <strong className="text-lg font-bold text-amber-400">5</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">In Progress</span>
                <strong className="text-lg font-bold text-blue-400">6</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed</span>
                <strong className="text-lg font-bold text-emerald-400">18</strong>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overdue</span>
                <strong className="text-lg font-bold text-rose-400">3</strong>
              </div>
            </div>

            {/* Progress Donut & Quick Scan Banner */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-850 rounded-2xl border border-slate-800 flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-3 shadow">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-slate-950">
                  <span className="text-xs font-bold text-emerald-400">56%</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Today&apos;s Service Progress</h3>
                  <p className="text-xs text-slate-400">18 Completed • 6 In Progress • 8 Pending</p>
                </div>
              </div>
              <button
                onClick={() => setQrModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                <QrCode size={16} />
                <span>Scan Unit</span>
              </button>
            </div>

            {/* Equipment Search & Filter bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Equipment Tag / Room (e.g. FCU-101)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => setCurrentScreen("equipment_list")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
              </button>
            </div>

            {/* Equipment Table List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Equipment List ({siteEquipmentList.length})
                </span>
                <button
                  onClick={() => setCurrentScreen("equipment_list")}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  View by Category <ChevronRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {siteEquipmentList.map((eq, idx) => (
                  <div
                    key={eq.id}
                    onClick={() => startServiceForEquipment(eq.id)}
                    className="px-4 py-3 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-white">{eq.tagNo || eq.name}</strong>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                            {eq.category || eq.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} /> {eq.room || eq.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {idx === 0 ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                          In Progress
                        </span>
                      ) : idx === 1 ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800 text-slate-400">
                          Not Started
                        </span>
                      )}
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 2: EQUIPMENT LIST (CATEGORY FILTERED) */}
        {/* ================================================================ */}
        {currentScreen === "equipment_list" && (
          <div className="space-y-4">
            {/* Banner info */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              <div className="flex flex-wrap justify-between items-center gap-2 text-slate-400">
                <span>Site: <strong className="text-white">{activeSite.name}</strong></span>
                <span>Date: <strong className="text-white">28 Jul 2026</strong></span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "All (32)" },
                { id: "FCU", label: "FCU (20)" },
                { id: "AHU", label: "AHU (2)" },
                { id: "CRAC", label: "CRAC (2)" },
                { id: "FAN", label: "Fan (8)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    categoryFilter === tab.id
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Equipment Grid Cards */}
            <div className="space-y-2.5">
              {siteEquipmentList.map((eq) => (
                <div
                  key={eq.id}
                  onClick={() => startServiceForEquipment(eq.id)}
                  className="p-3.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-white">{eq.tagNo || eq.name}</strong>
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {eq.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                      <p>Location: <span className="text-slate-300">{eq.room || eq.name}</span></p>
                      <p>Make / Model: <span className="text-slate-300">{eq.brand} / {eq.model}</span></p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 mb-1.5">
                      {eq.maintenanceFrequency || "Monthly"}
                    </span>
                    <div className="flex items-center justify-end gap-1 text-emerald-400 text-xs font-semibold">
                      <span>Open Checklist</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 3: CHECKLIST (FCU-101 / AHU-5-01) */}
        {/* ================================================================ */}
        {currentScreen === "checklist" && (
          <div className="space-y-4">
            {/* Header info badge */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <div className="flex flex-col min-[520px]:flex-row min-[520px]:justify-between min-[520px]:items-center gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{activeEquip.tagNo || activeEquip.name}</h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800 rounded">
                    In Progress
                  </span>
                </div>
                <span className="break-all text-xs text-slate-400 font-mono">FCU-2026-0728-0001</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-400">
                <p>Location: <span className="text-slate-200">{activeEquip.room || activeSite.name}</span></p>
                <p className="sm:text-right">Date: <span className="text-slate-200">28 Jul 2026 10:30 AM</span></p>
              </div>
            </div>

            {/* Checklist Legend */}
            <div className="flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">CHECKLIST (Monthly)</span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check size={13} className="stroke-[3]" /> Yes / OK
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <X size={13} className="stroke-[3]" /> No / Faulty
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-0.5 bg-slate-400 rounded inline-block" /> N/A
                </span>
              </div>
            </div>

            {/* Checklist Items list */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
              {checklistData.map((item, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-850/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-400 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-medium text-slate-200">{item.item}</span>
                        {item.section && (
                          <span className="block text-[10px] text-slate-500 uppercase">{item.section}</span>
                        )}
                      </div>
                    </div>

                    {/* Result Radio Buttons */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleChecklistResult(idx, "YES")}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          item.result === "YES"
                            ? "bg-emerald-600 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Yes / OK"
                      >
                        <Check size={14} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleChecklistResult(idx, "NO")}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          item.result === "NO"
                            ? "bg-rose-600 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="No / Faulty"
                      >
                        <X size={14} className="stroke-[3]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleChecklistResult(idx, "N/A")}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          item.result === "N/A"
                            ? "bg-slate-700 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="N/A"
                      >
                        <span className="w-2.5 h-0.5 bg-current rounded" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Remark */}
                  <div className="pl-7 flex items-center gap-2">
                    <Pencil size={11} className="text-slate-500" />
                    <input
                      type="text"
                      placeholder="Add remark..."
                      value={item.remark}
                      onChange={(e) => {
                        const val = e.target.value;
                        setChecklistData((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], remark: val };
                          return updated;
                        });
                      }}
                      className="bg-transparent border-b border-slate-800 text-[11px] text-slate-400 placeholder-slate-600 focus:outline-none focus:border-slate-600 flex-1 py-0.5"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentScreen("equipment_list")}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentScreen("measurements")}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
              >
                <span>Next: Measurements</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 4 & 5: MOTOR & DETAILED MEASUREMENTS */}
        {/* ================================================================ */}
        {(currentScreen === "measurements" || currentScreen === "other_measurements") && (
          <div className="space-y-4">
            {/* Equipment Header */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <strong className="text-white text-sm block">{activeEquip.tagNo || activeEquip.name}</strong>
                <span className="text-slate-400">{activeEquip.brand} / {activeEquip.model}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Rated Voltage: <strong className="text-white">415 V</strong></span>
                <span className="text-slate-400">Rated Current: <strong className="text-white">1.35 A</strong></span>
              </div>
            </div>

            {/* Measurement Sub-tabs (Motor | Air Side | Water Side | Others) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-center">
              {([
                { id: "motor", label: "Motor" },
                { id: "air", label: "Air Side" },
                { id: "water", label: "Water Side" },
                { id: "others", label: "Others" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMeasurementSubTab(tab.id)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                    measurementSubTab === tab.id
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Smart Abnormal Alert Banner if any parameter is out of limits */}
            {abnormalMeasurements.length > 0 && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
                <AlertTriangle size={18} className="text-rose-400 flex-shrink-0" />
                <div>
                  <strong className="font-semibold block text-rose-200">
                    Out of Limit Detected: {abnormalMeasurements[0].label}
                  </strong>
                  <span>Reading is {abnormalMeasurements[0].value} {abnormalMeasurements[0].unit} (Expected: {abnormalMeasurements[0].min}-{abnormalMeasurements[0].max} {abnormalMeasurements[0].unit})</span>
                </div>
              </div>
            )}

            {/* Motor Tab Content */}
            {measurementSubTab === "motor" && (
              <div className="space-y-4">
                {/* Single / Three Phase Selector */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 font-medium">Motor Wiring Configuration:</span>
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMotorPhase("single")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        motorPhase === "single" ? "bg-slate-800 text-white" : "text-slate-400"
                      }`}
                    >
                      Single Phase (230V)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMotorPhase("three")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        motorPhase === "three" ? "bg-emerald-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Three Phase (415V)
                    </button>
                  </div>
                </div>

                {/* Motor Running Current (R, Y, B, Avg) */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Motor Running Current (Amperes)
                    </h3>
                    <span className="text-[10px] text-slate-400">Normal Range: 1.0 - 1.8 A</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {measurementsData
                      .filter((m) => m.category === "motor" && m.phase && ["R", "Y", "B", "Avg"].includes(m.phase))
                      .map((m) => {
                        const originalIdx = measurementsData.findIndex((item) => item.label === m.label);
                        const isAbn = m.isAbnormal || m.status === "High" || m.status === "Abnormal";
                        return (
                          <div
                            key={m.label}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleAbnormalOverride(originalIdx);
                            }}
                            className={`p-3 rounded-xl border transition ${
                              isAbn
                                ? "bg-rose-950/40 border-rose-700"
                                : "bg-slate-950 border-slate-800"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold text-slate-400">
                                Phase {m.phase}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleAbnormalOverride(originalIdx)}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                  isAbn ? "bg-rose-600 text-white" : "bg-emerald-950 text-emerald-400"
                                }`}
                                title="Click to toggle Normal / Abnormal"
                              >
                                {isAbn ? "High / Abn" : "Normal"}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={m.value}
                                onChange={(e) => updateMeasurementValue(originalIdx, e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-xs text-slate-400 font-semibold">{m.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Voltage & Frequency Grid */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                    Supply Voltage & Frequency
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Voltage (R-Y)</span>
                      <strong className="text-sm text-white">415 V</strong>
                      <span className="text-[9px] text-emerald-400 block mt-0.5">Normal</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Voltage (Y-B)</span>
                      <strong className="text-sm text-white">414 V</strong>
                      <span className="text-[9px] text-emerald-400 block mt-0.5">Normal</span>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Frequency</span>
                      <strong className="text-sm text-white">50.0 Hz</strong>
                      <span className="text-[9px] text-emerald-400 block mt-0.5">Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Air Side / Other Tabs Content */}
            {measurementSubTab !== "motor" && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                  {measurementSubTab === "air" ? "Air Side Parameters" : "Other Environmental Readings"}
                </h3>
                <div className="space-y-2.5">
                  {measurementsData
                    .filter((m) => (measurementSubTab === "air" ? m.category === "air" : m.category !== "motor"))
                    .map((m) => {
                      const originalIdx = measurementsData.findIndex((item) => item.label === m.label);
                      return (
                        <div
                          key={m.label}
                          className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800"
                        >
                          <div>
                            <span className="text-xs font-medium text-slate-200">{m.label}</span>
                            <span className="block text-[10px] text-slate-500">
                              Range: {m.min ?? 10} - {m.max ?? 30} {m.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={m.value}
                              onChange={(e) => updateMeasurementValue(originalIdx, e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white text-right focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-xs text-slate-400 w-8">{m.unit}</span>
                            <button
                              type="button"
                              onClick={() => toggleAbnormalOverride(originalIdx)}
                              className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${
                                m.isAbnormal ? "bg-rose-600 text-white" : "bg-emerald-950 text-emerald-400"
                              }`}
                            >
                              {m.isAbnormal ? "Abnormal" : "Normal"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center italic">
              💡 Tip: Click status badge or right-click reading to toggle Abnormal override.
            </p>

            {/* Bottom Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentScreen("checklist")}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentScreen("remarks_photos")}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
              >
                <span>Next: Remarks & Photos</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 6: REMARKS & PHOTOS */}
        {/* ================================================================ */}
        {currentScreen === "remarks_photos" && (
          <div className="space-y-4">
            {/* Remarks Section */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Remarks / Observations
                </label>
                <span className="text-[10px] text-slate-400">{remarksText.length}/250 chars</span>
              </div>

              <textarea
                rows={3}
                maxLength={250}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Enter field observations, motor status, abnormal reasons..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
              />

              {/* Quick Suggestion Pills */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1.5">
                  Quick Suggestions (Tap to insert):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Filter dirty",
                    "Coil dirty",
                    "Drain pan dirty",
                    "Noise observed",
                    "Vibration high",
                    "Replaced capacitor",
                    "Checked refrigerant",
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => appendQuickSuggestion(sugg)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700/60 transition"
                    >
                      + {sugg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Photos Section (Before / During / After stages) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Site Photos (Optional)
                  </h3>
                  <p className="text-[10px] text-slate-400">Max 3 MB per photo • Auto-compressed</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400">{capturedPhotos.length}/6 photos</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {capturedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 px-1.5 py-0.5 text-[9px] text-slate-300 truncate text-center">
                      {photo.stage.toUpperCase()}: {photo.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCapturedPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full opacity-80 hover:opacity-100 transition"
                      title="Remove photo"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button */}
                {capturedPhotos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newPhoto = {
                        id: `photo-${Date.now()}`,
                        stage: (["before", "during", "after"] as const)[capturedPhotos.length % 3],
                        name: `Service Stage ${capturedPhotos.length + 1}`,
                        url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' fill='%23334155'><rect width='200' height='150' fill='%230f172a'/><text x='100' y='75' fill='%2338bdf8' font-family='sans-serif' font-size='12' text-anchor='middle'>Captured Photo</text></svg>",
                      };
                      setCapturedPhotos((prev) => [...prev, newPhoto]);
                      showToast("Added service photo.");
                    }}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-400 aspect-video transition"
                  >
                    <Camera size={18} />
                    <span className="text-[10px] font-semibold">+ Add Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentScreen("measurements")}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentScreen("signatures")}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
              >
                <span>Next: Signatures</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 7: SIGNATURE MODE & DIGITAL SIGNATURES */}
        {/* ================================================================ */}
        {currentScreen === "signatures" && (
          <div className="space-y-4">
            {/* Signature Mode Selection */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                Signature Mode (Singapore Compliance)
              </h3>
              <div className="space-y-2">
                {[
                  {
                    id: "selected_today" as const,
                    title: "Selected Equipment (Today) - One Signature",
                    desc: "Client representative signs once for all units serviced today.",
                  },
                  {
                    id: "individual" as const,
                    title: "Individual Equipment Signature",
                    desc: "Client signs each piece of equipment separately.",
                  },
                  {
                    id: "category_summary" as const,
                    title: "Category Summary Signature",
                    desc: "One signature per equipment category (e.g. all FCUs).",
                  },
                  {
                    id: "overall" as const,
                    title: "Overall Service Report Signature",
                    desc: "One signature for the full building service report.",
                  },
                  {
                    id: "no_signature" as const,
                    title: "No Client Signature (Email Dispatch)",
                    desc: "Report will be dispatched directly to client email contacts.",
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                      signatureMode === mode.id
                        ? "bg-emerald-950/40 border-emerald-600 text-white"
                        : "bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-850"
                    }`}
                  >
                    <input
                      type="radio"
                      name="signatureMode"
                      checked={signatureMode === mode.id}
                      onChange={() => setSignatureMode(mode.id)}
                      className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <strong className="text-xs font-semibold block">{mode.title}</strong>
                      <span className="text-[10px] text-slate-400">{mode.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Signature Pads */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Technician Sign */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-300 block">Technician Signature</span>
                <div className="h-20 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-2">
                  {technicianSignature ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={technicianSignature} alt="Tech Sig" className="max-h-12" />
                  ) : (
                    <span className="text-xs text-slate-500">Sign here</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>K. Suresh</span>
                  <span>28 Jul 2026</span>
                </div>
              </div>

              {/* Supervisor Sign */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-300 block">Supervisor (Optional)</span>
                <div className="h-20 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-2">
                  {supervisorSignature ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={supervisorSignature} alt="Supervisor Sig" className="max-h-12" />
                  ) : (
                    <span className="text-xs text-slate-500">Sign here</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>M. Kumar</span>
                  <span>28 Jul 2026</span>
                </div>
              </div>

              {/* Client Sign */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-400 block">
                  Client Representative ({activeClient.contactName || "Mr. John Tan"})
                </span>
                <div
                  onClick={() => {
                    setClientSignature(
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><path d='M10 25 Q 40 10, 70 20 T 110 30' stroke='%2338bdf8' stroke-width='2' fill='none'/></svg>"
                    );
                    showToast("Client signature captured.");
                  }}
                  className="h-20 bg-slate-950 hover:bg-slate-900 rounded-lg border border-dashed border-emerald-600/60 flex items-center justify-center p-2 cursor-pointer transition"
                >
                  {clientSignature ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={clientSignature} alt="Client Sig" className="max-h-12" />
                  ) : (
                    <div className="text-center">
                      <Pencil size={14} className="mx-auto text-emerald-400 mb-1" />
                      <span className="text-[11px] font-semibold text-emerald-400">Tap to Sign / Stylus</span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>{activeClient.contactName || "John Tan"}</span>
                  <span>{clientSignature ? "Signed" : "Pending"}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCurrentScreen("remarks_photos")}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentScreen("report_preview")}
                className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
              >
                <span>Save & Preview Report</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 8: REPORT PREVIEW & DISPATCH */}
        {/* ================================================================ */}
        {currentScreen === "report_preview" && (
          <div className="space-y-4">
            {/* Branded Header Preview */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3 shadow">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">PROMACH PTE. LTD.</h2>
                  <p className="text-xs text-slate-400">8 Temasek Boulevard, Suntec Tower Three, Singapore</p>
                  <p className="text-[10px] text-slate-500">UEN/GST No: 202008249W • BCA Registered • bizSAFE STAR</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Report No.</span>
                  <strong className="text-sm font-mono text-emerald-400">FCU-2026-0728-0001</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">28 Jul 2026</span>
                </div>
              </div>

              {/* Service Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Checklist</span>
                  <strong className="text-sm font-bold text-white">{checklistData.length}</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-emerald-400 block">OK</span>
                  <strong className="text-sm font-bold text-emerald-400">
                    {checklistData.filter((c) => c.result === "YES").length}
                  </strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-rose-400 block">Abnormal</span>
                  <strong className="text-sm font-bold text-rose-400">{abnormalMeasurements.length}</strong>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Photos</span>
                  <strong className="text-sm font-bold text-blue-400">{capturedPhotos.length}</strong>
                </div>
              </div>

              {/* Abnormal Findings Table */}
              {abnormalMeasurements.length > 0 && (
                <div className="bg-rose-950/30 rounded-xl border border-rose-800 p-3 space-y-2">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
                    Abnormal Parameters Recorded
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {abnormalMeasurements.map((abn) => (
                      <div key={abn.label} className="flex justify-between items-center text-slate-300">
                        <span>• {abn.label} ({abn.phase || "Motor"})</span>
                        <strong className="text-rose-400">
                          {abn.value} {abn.unit} (Limit: {abn.max} {abn.unit})
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos Preview */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Service Evidence Photos ({capturedPhotos.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {capturedPhotos.map((p) => (
                    <div key={p.id} className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.name} className="w-full h-16 object-cover" />
                      <span className="block text-[9px] text-center text-slate-400 py-0.5">{p.stage.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar (Download PDF, Email Report, Share) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={handleDownloadPdf}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
              >
                <Download size={16} />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => setEmailModalOpen(true)}
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
              >
                <Mail size={16} />
                <span>Email Report</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText?.(window.location.href);
                  showToast("Report verification link copied to clipboard.");
                }}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                <span>Share Link</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SCREEN 9: REPORT SENT CONFIRMATION */}
        {/* ================================================================ */}
        {currentScreen === "report_sent" && (
          <div className="max-w-md mx-auto py-8 text-center space-y-5">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 size={42} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Report Sent Successfully!</h2>
              <p className="text-xs text-slate-400">
                Report No: <strong className="text-emerald-400 font-mono">FCU-2026-0728-0001</strong>
              </p>
              <p className="text-xs text-slate-400">
                Dispatched to 3 recipients on 28 Jul 2026 at 11:20 AM (SGT).
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Delivered To:</span>
              <p className="text-slate-300 flex items-center gap-2">✓ facilities@paragon.sg (Client)</p>
              <p className="text-slate-300 flex items-center gap-2">✓ maintenance@paragon.sg (Client FM)</p>
              <p className="text-slate-300 flex items-center gap-2">✓ supervisor@promachpl.com (Promach ACMV)</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen("dashboard")}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow"
              >
                Download PDF
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ================================================================ */}
      {/* QR SCANNER MODAL */}
      {/* ================================================================ */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Scan Equipment QR Code</h3>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-square bg-slate-950 rounded-xl border-2 border-emerald-500/80 flex flex-col items-center justify-center overflow-hidden">
              <div className="w-48 h-48 border-2 border-emerald-400 rounded-lg flex items-center justify-center relative animate-pulse">
                <QrCode size={96} className="text-emerald-500/30" />
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Align QR code within frame</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                Or Select Equipment Directly:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setQrModalOpen(false);
                    startServiceForEquipment("PAR-FCU-101");
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left border border-slate-700 text-xs font-semibold text-white"
                >
                  FCU-101 (Room 101)
                </button>
                <button
                  onClick={() => {
                    setQrModalOpen(false);
                    startServiceForEquipment("TP-AHU-5-01");
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left border border-slate-700 text-xs font-semibold text-white"
                >
                  AHU-5-01 (CCP 5)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* EMAIL DISPATCH MODAL */}
      {/* ================================================================ */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-blue-400" />
                <h3 className="font-bold text-sm text-white">Email Service Report</h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Recipients (Comma separated)</label>
                <input
                  type="text"
                  value={emailAddresses}
                  onChange={(e) => setEmailAddresses(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                <p>Attachment: <strong className="text-white">FCU-2026-0728-0001.pdf</strong> (180 KB)</p>
                <p>Status: Signed & Verified • BCA / bizSAFE STAR</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEmailModalOpen(false);
                  setCurrentScreen("report_sent");
                  showToast("Report dispatched via email.");
                }}
                className="flex-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Send size={14} />
                <span>Send Email Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 w-[calc(100%_-_2rem)] max-w-md bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center justify-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Bottom Navigation for Mobile / Tablet */}
      <nav className="field-mobile-nav fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-2 px-1 text-[10px] md:hidden">
        <button
          onClick={() => setCurrentScreen("dashboard")}
          className={`flex flex-col items-center gap-1 ${
            currentScreen === "dashboard" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentScreen("equipment_list")}
          className={`flex flex-col items-center gap-1 ${
            currentScreen === "equipment_list" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wrench size={18} />
          <span>Equipment</span>
        </button>
        <button
          onClick={() => setQrModalOpen(true)}
          className="flex flex-col items-center gap-1 text-emerald-400 font-bold"
        >
          <div className="w-8 h-8 -mt-3 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
            <QrCode size={18} />
          </div>
          <span>Scan</span>
        </button>
        <button
          onClick={() => setCurrentScreen("checklist")}
          className={`flex flex-col items-center gap-1 ${
            currentScreen === "checklist" || currentScreen === "measurements"
              ? "text-emerald-400 font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText size={18} />
          <span>Service</span>
        </button>
        <button
          onClick={() => setCurrentScreen("report_preview")}
          className={`flex flex-col items-center gap-1 ${
            currentScreen === "report_preview" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck2 size={18} />
          <span>Reports</span>
        </button>
      </nav>
    </div>
  );
}
