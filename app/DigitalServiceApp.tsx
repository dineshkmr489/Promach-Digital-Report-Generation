"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  PencilLine,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Signature,
  Tag,
  Trash2,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { CompanyProfile } from "./reportData";
import { downloadServiceReportPdf } from "./reportPdf";
import { SignaturePad } from "./SignaturePad";
import type {
  ChecklistTemplateRecord,
  ClientRecord,
  CreateReportPayload,
  EquipmentRecord,
  LocationRecord,
  MasterEntity,
  ServiceTypeRecord,
  TechnicianRecord,
  WorkspaceReport,
  WorkspaceSnapshot,
} from "./workspaceTypes";

type View = "overview" | "reports" | "create" | "master";
type MasterTab = MasterEntity;
type MasterRecord =
  | ClientRecord
  | LocationRecord
  | EquipmentRecord
  | ChecklistTemplateRecord
  | TechnicianRecord
  | ServiceTypeRecord;

const navItems = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "reports" as const, label: "Service reports", icon: FileText },
  { id: "create" as const, label: "Create report", icon: FilePlus2 },
  { id: "master" as const, label: "Master data", icon: Building2 },
];

const masterTabs = [
  { id: "clients" as const, label: "Clients", icon: Building2 },
  { id: "locations" as const, label: "Sites", icon: MapPin },
  { id: "equipment" as const, label: "Equipment", icon: Gauge },
  {
    id: "checklist-templates" as const,
    label: "Checklists",
    icon: ClipboardCheck,
  },
  { id: "technicians" as const, label: "Technicians", icon: UsersRound },
  { id: "service-types" as const, label: "Service Types", icon: Tag },
];

function masterSingular(entity: MasterEntity): string {
  if (entity === "checklist-templates") return "checklist template";
  if (entity === "service-types") return "service type";
  if (entity === "equipment") return "equipment";
  if (entity === "locations") return "site";
  if (entity === "technicians") return "technician";
  return "client";
}

export function DigitalServiceApp({
  adminName,
  adminEmail,
  initialWorkspace,
}: {
  adminName: string;
  adminEmail: string;
  initialWorkspace: WorkspaceSnapshot;
}) {
  const [view, setView] = useState<View>("overview");
  const [masterTab, setMasterTab] = useState<MasterTab>("clients");
  const [masterNavigationOpen, setMasterNavigationOpen] = useState(false);
  const [workspace, setWorkspace] =
    useState<WorkspaceSnapshot>(initialWorkspace);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<WorkspaceReport | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [shareState, setShareState] = useState<{
    report: WorkspaceReport;
    url: string;
  } | null>(null);
  const [signingReport, setSigningReport] =
    useState<WorkspaceReport | null>(null);

  const filteredReports = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return workspace.reports;
    return workspace.reports.filter((report) =>
      [
        report.id,
        report.client,
        report.address,
        report.status,
        report.summary,
        ...report.equipment.map((equipment) => equipment.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, workspace.reports]);

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  function navigateFromSidebar(nextView: View) {
    if (nextView === "master") {
      if (view === "master") {
        setMasterNavigationOpen((open) => !open);
        return;
      }
      setMasterNavigationOpen(true);
    } else {
      setMasterNavigationOpen(false);
    }
    navigate(nextView);
  }

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Unable to sign out.");
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
      toast("Unable to sign out. Please try again.");
    }
  }

  async function generatePdf(report: WorkspaceReport) {
    try {
      await downloadServiceReportPdf(report, workspace.company);
      toast(`Report ${report.id} PDF generated.`);
    } catch {
      toast(`Report ${report.id} PDF could not be generated.`);
    }
  }

  async function sendReport(report: WorkspaceReport) {
    const response = await fetch(`/api/reports/${report.id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const payload = (await response.json()) as
      | { sharePath: string; workspace: WorkspaceSnapshot }
      | { error: string };
    if (!response.ok || !("sharePath" in payload)) {
      throw new Error(
        "error" in payload ? payload.error : "Unable to send report",
      );
    }
    setWorkspace(payload.workspace);
    const updated =
      payload.workspace.reports.find((item) => item.id === report.id) ?? report;
    setSelectedReport(updated);
    setShareState({
      report: updated,
      url: `${window.location.origin}${payload.sharePath}`,
    });
  }

  async function signedOnAdminDevice(nextWorkspace: WorkspaceSnapshot) {
    setWorkspace(nextWorkspace);
    setSigningReport(null);
    const report = nextWorkspace.reports.find(
      (item) => item.id === signingReport?.id,
    );
    setSelectedReport(report ?? null);
    toast(`Report ${report?.id ?? ""} signed and locked.`);
  }

  const awaiting = workspace.reports.filter(
    (report) => report.status === "Awaiting client signature",
  ).length;

  return (
    <div className="real-app-shell">
      <aside className={`real-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="real-brand">
          <span className="real-brand-mark">
            <Image
              alt="Promach"
              height={38}
              priority
              src="/brand/promach-logo.png"
              width={38}
            />
          </span>
          <div>
            <strong>PROMACH</strong>
            <small>Digital service reports</small>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <span className="nav-overline">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="sidebar-nav-group" key={item.id}>
                <button
                  aria-controls={
                    item.id === "master"
                      ? "sidebar-master-navigation"
                      : undefined
                  }
                  aria-expanded={
                    item.id === "master"
                      ? masterNavigationOpen
                      : undefined
                  }
                  className={view === item.id ? "active" : ""}
                  onClick={() => navigateFromSidebar(item.id)}
                  type="button"
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.id === "reports" && <i>{workspace.reports.length}</i>}
                  {item.id === "create" && <Plus size={14} />}
                  {item.id === "master" && (
                    <ChevronRight
                      className={`sidebar-disclosure ${
                        masterNavigationOpen ? "open" : ""
                      }`}
                      size={15}
                    />
                  )}
                </button>
                {item.id === "master" && masterNavigationOpen && (
                  <div
                    className="sidebar-master-links"
                    id="sidebar-master-navigation"
                  >
                    {masterTabs.map((master) => {
                      const MasterIcon = master.icon;
                      return (
                        <button
                          className={
                            view === "master" && masterTab === master.id
                              ? "active"
                              : ""
                          }
                          key={master.id}
                          onClick={() => {
                            setMasterTab(master.id);
                            setMasterNavigationOpen(true);
                            navigate("master");
                          }}
                          type="button"
                        >
                          <MasterIcon size={15} />
                          <span>{master.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="admin-mini">
          <span><UserRound size={15} /></span>
          <div>
            <strong>{adminName}</strong>
            <small>{adminEmail}</small>
          </div>
          <button
            aria-label="Sign out"
            className="admin-sign-out"
            disabled={signingOut}
            onClick={() => void signOut()}
            title="Sign out"
            type="button"
          >
            {signingOut ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <LogOut size={14} />
            )}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="real-menu-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <main className="real-main">
        <header className="real-topbar">
          <div>
            <button
              className="real-menu-button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu size={21} />
            </button>
            <label className="real-search">
              <Search size={18} />
              <input
                aria-label="Search reports"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search report, client, site, equipment…"
                value={query}
              />
            </label>
          </div>
          <div className="topbar-actions">
            <div className="dataset-pill">
              <span />
              {awaiting} awaiting signature
            </div>
            <button
              className="quick-create"
              onClick={() => navigate("create")}
              type="button"
            >
              <Plus size={16} /> New report
            </button>
          </div>
        </header>

        <div className="real-page">
          {view === "overview" && (
            <Overview
              workspace={workspace}
              reports={filteredReports}
              onCreate={() => navigate("create")}
              onOpen={setSelectedReport}
              onViewReports={() => navigate("reports")}
            />
          )}
          {view === "reports" && (
            <Reports
              reports={filteredReports}
              onCreate={() => navigate("create")}
              onOpen={setSelectedReport}
            />
          )}
          {view === "create" && (
            <CreateReport
              workspace={workspace}
              onCreated={(nextWorkspace, report) => {
                setWorkspace(nextWorkspace);
                setSelectedReport(report);
                setView("reports");
                toast(`Draft report ${report.id} created.`);
              }}
              onManageMaster={() => navigate("master")}
            />
          )}
          {view === "master" && (
            <MasterData
              workspace={workspace}
              tab={masterTab}
              onWorkspaceChange={setWorkspace}
              onNotice={toast}
            />
          )}
        </div>
      </main>

      <nav className="real-mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
              type="button"
            >
              <Icon size={19} />
              <span>{item.label.replace("Service ", "")}</span>
            </button>
          );
        })}
      </nav>

      {selectedReport && (
        <ReportDetail
          company={workspace.company}
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onGenerate={generatePdf}
          onSend={async (report) => {
            try {
              await sendReport(report);
            } catch (error) {
              toast(
                error instanceof Error ? error.message : "Unable to send report",
              );
            }
          }}
          onSignHere={setSigningReport}
        />
      )}

      {shareState && (
        <ShareDialog
          state={shareState}
          onClose={() => setShareState(null)}
          onNotice={toast}
        />
      )}

      {signingReport && (
        <AdminSignatureDialog
          report={signingReport}
          onClose={() => setSigningReport(null)}
          onSigned={signedOnAdminDevice}
        />
      )}

      {notice && (
        <div className="real-toast" role="status">
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="real-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: WorkspaceReport["status"] }) {
  const className =
    status === "Completed"
      ? "completed"
      : status === "Awaiting client signature"
        ? "awaiting"
        : status === "Draft"
          ? "draft"
          : "attention";
  return (
    <span className={`workflow-status ${className}`}>
      {status === "Completed" ? (
        <CheckCircle2 size={13} />
      ) : status === "Awaiting client signature" ? (
        <Signature size={13} />
      ) : (
        <PencilLine size={13} />
      )}
      {status}
    </span>
  );
}

function Overview({
  workspace,
  reports,
  onCreate,
  onOpen,
  onViewReports,
}: {
  workspace: WorkspaceSnapshot;
  reports: WorkspaceReport[];
  onCreate: () => void;
  onOpen: (report: WorkspaceReport) => void;
  onViewReports: () => void;
}) {
  const completed = workspace.reports.filter(
    (report) => report.status === "Completed",
  ).length;
  const awaiting = workspace.reports.filter(
    (report) => report.status === "Awaiting client signature",
  ).length;
  const drafts = workspace.reports.filter(
    (report) => report.status === "Draft",
  ).length;

  return (
    <>
      <PageHeading
        eyebrow="Admin workspace · live report workflow"
        title="Service reporting, end to end"
        description="Maintain reusable data, create each report once, share it securely with the client, and keep the signed result locked with its audit history."
        action={
          <button className="real-primary-button" onClick={onCreate} type="button">
            <Plus size={17} />
            Create service report
          </button>
        }
      />

      <section className="real-metrics" aria-label="Workflow totals">
        <Metric icon={FileText} label="All reports" value={String(workspace.reports.length).padStart(2, "0")} note={`${drafts} drafts`} tone="blue" />
        <Metric icon={Signature} label="Awaiting signature" value={String(awaiting).padStart(2, "0")} note="Secure links active" tone="amber" />
        <Metric icon={FileCheck2} label="Signed and locked" value={String(completed).padStart(2, "0")} note="PDF ready" tone="green" />
        <Metric icon={Building2} label="Active clients" value={String(workspace.clients.length).padStart(2, "0")} note={`${workspace.equipment.length} equipment records`} tone="violet" />
      </section>

      <section className="workflow-banner">
        <div>
          <span>Digital report workflow</span>
          <h2>One structured record from service entry to client signature.</h2>
        </div>
        <div className="workflow-steps">
          <span><i>1</i> Master data</span>
          <ChevronRight size={16} />
          <span><i>2</i> Draft report</span>
          <ChevronRight size={16} />
          <span><i>3</i> Share or sign here</span>
          <ChevronRight size={16} />
          <span><i>4</i> Locked PDF</span>
        </div>
      </section>

      <section className="real-dashboard-grid operational-grid">
        <article className="real-panel">
          <div className="real-panel-heading">
            <div>
              <span>Current work</span>
              <h2>Recent service reports</h2>
              <p>Open a report to send, sign, review, or download.</p>
            </div>
            <button className="real-text-button" onClick={onViewReports} type="button">
              View all <ArrowRight size={15} />
            </button>
          </div>
          <div className="real-report-list">
            {reports.slice(0, 5).map((report) => (
              <OperationalReportRow
                key={report.id}
                report={report}
                onOpen={() => onOpen(report)}
              />
            ))}
          </div>
        </article>

        <article className="real-panel action-panel">
          <div className="real-panel-heading">
            <div>
              <span>Ready to use</span>
              <h2>Master data coverage</h2>
            </div>
          </div>
          <div className="master-coverage">
            <Coverage icon={Building2} label="Clients" count={workspace.clients.length} />
            <Coverage icon={MapPin} label="Sites" count={workspace.locations.length} />
            <Coverage icon={Gauge} label="Equipment" count={workspace.equipment.length} />
            <Coverage icon={ClipboardCheck} label="Checklists" count={workspace.checklistTemplates.length} />
            <Coverage icon={UsersRound} label="Technicians" count={workspace.technicians.length} />
            <Coverage icon={Tag} label="Service Types" count={workspace.serviceTypes.length} />
          </div>
          <button className="create-callout" onClick={onCreate} type="button">
            <span><FilePlus2 size={21} /></span>
            <div><strong>Create the next report</strong><small>Choose a client and the app loads its sites, equipment, and checklists.</small></div>
            <ArrowRight size={17} />
          </button>
        </article>
      </section>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article>
      <span className={`real-metric-icon ${tone}`}><Icon size={21} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Coverage({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Building2;
  label: string;
  count: number;
}) {
  return (
    <div>
      <span><Icon size={16} /></span>
      <strong>{label}</strong>
      <small>{count} active</small>
    </div>
  );
}

function OperationalReportRow({
  report,
  onOpen,
}: {
  report: WorkspaceReport;
  onOpen: () => void;
}) {
  return (
    <button className="operational-report-row" onClick={onOpen} type="button">
      <span className="report-number"><small>Report</small><strong>#{report.id}</strong></span>
      <span className="report-client">
        <strong>{report.client}</strong>
        <small><MapPin size={13} /> {report.address}</small>
      </span>
      <span className="report-date"><small>Service date</small><strong>{report.date}</strong></span>
      <StatusBadge status={report.status} />
      <ChevronRight size={18} />
    </button>
  );
}

function Reports({
  reports,
  onCreate,
  onOpen,
}: {
  reports: WorkspaceReport[];
  onCreate: () => void;
  onOpen: (report: WorkspaceReport) => void;
}) {
  const [pageSize, setPageSize] = useState(10);
  const reportKey = reports.map((report) => report.id).join("|");
  const [pageState, setPageState] = useState({ key: reportKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
  const requestedPage = pageState.key === reportKey ? pageState.page : 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleReports = reports.slice(pageStart, pageStart + pageSize);

  const statusCounts = reports.reduce<Record<string, number>>((counts, report) => {
    counts[report.status] = (counts[report.status] ?? 0) + 1;
    return counts;
  }, {});
  return (
    <>
      <PageHeading
        eyebrow={`${reports.length} report records`}
        title="Service reports"
        description="Draft, send, collect the client signature, and download the locked signed copy from one place."
        action={
          <button className="real-primary-button" onClick={onCreate} type="button">
            <Plus size={17} /> New report
          </button>
        }
      />
      <section className="report-status-summary">
        {["Draft", "Awaiting client signature", "Completed"].map((status) => (
          <span key={status}>
            <strong>{statusCounts[status] ?? 0}</strong>
            {status}
          </span>
        ))}
      </section>
      <section className="real-panel reports-page operational-reports">
        <div className="report-table-head">
          <span>Report</span>
          <span>Client and site</span>
          <span>Service date</span>
          <span>Status</span>
          <span aria-hidden="true" />
        </div>
        <div>
          {visibleReports.map((report) => (
            <OperationalReportRow key={report.id} report={report} onOpen={() => onOpen(report)} />
          ))}
          {!reports.length && (
            <div className="real-empty">
              <Search size={24} />
              <strong>No matching report</strong>
              <span>Try another report number, client, site, or status.</span>
            </div>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          itemLabel="reports"
          onPageChange={(nextPage) => setPageState({ key: reportKey, page: nextPage })}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPageState({ key: reportKey, page: 1 });
          }}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25]}
          totalItems={reports.length}
        />
      </section>
    </>
  );
}

function CreateReport({
  workspace,
  onCreated,
  onManageMaster,
}: {
  workspace: WorkspaceSnapshot;
  onCreated: (workspace: WorkspaceSnapshot, report: WorkspaceReport) => void;
  onManageMaster: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateReportPayload>({
    clientId: "",
    locationId: "",
    serviceDate: new Date().toISOString().slice(0, 10),
    serviceType:
      workspace.serviceTypes.find(
        (item) => item.active && item.name === "Regular Service",
      )?.name ??
      workspace.serviceTypes.find((item) => item.active)?.name ??
      "",
    summary: "",
    workPerformed: [""],
    equipmentIds: [],
    checklistResults: {},
    measurements: {},
    equipmentNotes: {},
    technicianIds: [],
    remarks: "",
    followUp: "No follow-up required.",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const locations = workspace.locations.filter(
    (item) => item.clientId === form.clientId,
  );
  const equipment = workspace.equipment.filter(
    (item) =>
      item.clientId === form.clientId && item.locationId === form.locationId,
  );
  const selectedClient = workspace.clients.find(
    (item) => item.id === form.clientId,
  );
  const selectedLocation = workspace.locations.find(
    (item) => item.id === form.locationId,
  );
  const selectedEquipment = workspace.equipment.filter((item) =>
    form.equipmentIds.includes(item.id),
  );
  const selectedTechnicians = workspace.technicians.filter((item) =>
    form.technicianIds.includes(item.id),
  );

  function update<K extends keyof CreateReportPayload>(
    key: K,
    value: CreateReportPayload[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(
    key: "technicianIds",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function toggleEquipment(equipmentId: string) {
    const item = workspace.equipment.find(
      (candidate) => candidate.id === equipmentId,
    );
    const template = workspace.checklistTemplates.find(
      (candidate) => candidate.id === item?.checklistTemplateId,
    );
    setForm((current) => {
      const selected = current.equipmentIds.includes(equipmentId);
      if (selected) {
        return {
          ...current,
          equipmentIds: current.equipmentIds.filter(
            (id) => id !== equipmentId,
          ),
        };
      }
      return {
        ...current,
        equipmentIds: [...current.equipmentIds, equipmentId],
        checklistResults: {
          ...current.checklistResults,
          [equipmentId]: (template?.items ?? []).map((checkItem) => ({
            item: checkItem,
            result: "YES" as const,
            remark: "",
          })),
        },
        measurements: {
          ...current.measurements,
          [equipmentId]: (template?.measurements ?? []).map((measurement) => ({
            ...measurement,
            value: "",
          })),
        },
        equipmentNotes: {
          ...current.equipmentNotes,
          [equipmentId]: "Service checklist completed.",
        },
      };
    });
  }

  function updateChecklistResult(
    equipmentId: string,
    index: number,
    fieldName: "result" | "remark",
    value: string,
  ) {
    setForm((current) => {
      const next = [...(current.checklistResults[equipmentId] ?? [])];
      const existing = next[index];
      if (!existing) return current;
      next[index] = {
        ...existing,
        [fieldName]: value,
      } as typeof existing;
      return {
        ...current,
        checklistResults: {
          ...current.checklistResults,
          [equipmentId]: next,
        },
      };
    });
  }

  function updateMeasurement(
    equipmentId: string,
    index: number,
    value: string,
  ) {
    setForm((current) => {
      const next = [...(current.measurements[equipmentId] ?? [])];
      if (!next[index]) return current;
      next[index] = { ...next[index], value };
      return {
        ...current,
        measurements: { ...current.measurements, [equipmentId]: next },
      };
    });
  }

  function next() {
    setError("");
    if (
      step === 1 &&
      (!form.clientId ||
        !form.locationId ||
        !form.serviceDate ||
        !form.serviceType)
    ) {
      setError("Select the client, service site, service date, and service type.");
      return;
    }
    if (
      step === 2 &&
      (!form.equipmentIds.length ||
        !form.summary.trim() ||
        !form.workPerformed.some((item) => item.trim()))
    ) {
      setError("Select equipment and add the service summary and work performed.");
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  async function createDraft() {
    if (!form.technicianIds.length) {
      setError("Select at least one technician.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          workPerformed: form.workPerformed.filter((item) => item.trim()),
        }),
      });
      const payload = (await response.json()) as
        | { workspace: WorkspaceSnapshot; report: WorkspaceReport }
        | { error: string };
      if (!response.ok || !("workspace" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to create draft",
        );
      }
      onCreated(payload.workspace, payload.report);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to create draft",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Guided report builder"
        title="Create service report"
        description="The selected master data is copied into the report so the signed version always preserves the exact client, site, service type, equipment, checklist, and technicians used."
      />
      <div className="create-layout">
        <aside className="create-steps">
          {[
            ["1", "Client and visit", "Choose customer, site, and date"],
            ["2", "Service details", "Equipment, checklist, and work"],
            ["3", "Team and review", "Technicians and final confirmation"],
          ].map(([number, title, copy], index) => (
            <button
              className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""}
              key={number}
              onClick={() => index + 1 < step && setStep(index + 1)}
              type="button"
            >
              <span>{step > index + 1 ? <Check size={16} /> : number}</span>
              <div><strong>{title}</strong><small>{copy}</small></div>
            </button>
          ))}
          <div className="master-shortcut">
            <Building2 size={18} />
            <strong>Missing a record?</strong>
            <p>Add a new client, site, service type, equipment item, checklist, or technician first.</p>
            <button onClick={onManageMaster} type="button">Open master data <ArrowRight size={14} /></button>
          </div>
        </aside>

        <section className="real-panel create-form">
          {step === 1 && (
            <>
              <FormSectionHeading number="01" title="Client and service visit" description="Select from reusable master data." />
              <div className="form-grid two">
                <label>
                  Client
                  <select
                    required
                    value={form.clientId}
                    onChange={(event) => {
                      update("clientId", event.target.value);
                      update("locationId", "");
                      update("equipmentIds", []);
                    }}
                  >
                    <option value="">Select client</option>
                    {workspace.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Service site
                  <select
                    disabled={!form.clientId}
                    required
                    value={form.locationId}
                    onChange={(event) => {
                      update("locationId", event.target.value);
                      update("equipmentIds", []);
                    }}
                  >
                    <option value="">Select site</option>
                    {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Service date
                  <input required type="date" value={form.serviceDate} onChange={(event) => update("serviceDate", event.target.value)} />
                </label>
                <label>
                  Service type
                  <select required value={form.serviceType} onChange={(event) => update("serviceType", event.target.value)}>
                    <option value="">Select service type</option>
                    {workspace.serviceTypes.filter((item) => item.active).map((item) => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedClient && selectedLocation && (
                <div className="selection-preview">
                  <Building2 size={18} />
                  <div><strong>{selectedClient.name}</strong><span>{selectedLocation.name} · {selectedLocation.address}</span></div>
                  <CheckCircle2 size={18} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <FormSectionHeading number="02" title="Equipment and work completed" description="Equipment automatically carries its assigned checklist." />
              {!equipment.length ? (
                <div className="inline-empty">
                  <Gauge size={24} />
                  <strong>No equipment at this site</strong>
                  <p>Add the site equipment in master data before creating this report.</p>
                  <button className="real-secondary-button" onClick={onManageMaster} type="button">Open master data</button>
                </div>
              ) : (
                <div className="equipment-picker">
                  {equipment.map((item) => {
                    const template = workspace.checklistTemplates.find((templateItem) => templateItem.id === item.checklistTemplateId);
                    const selected = form.equipmentIds.includes(item.id);
                    return (
                      <button className={selected ? "selected" : ""} key={item.id} onClick={() => toggleEquipment(item.id)} type="button">
                        <span>{selected ? <Check size={16} /> : <Gauge size={16} />}</span>
                        <div><strong>{item.name}</strong><small>{item.type} · {item.brand} {item.model}</small><i>{template?.items.length ?? 0} checklist items</i></div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedEquipment.map((item) => {
                const template = workspace.checklistTemplates.find(
                  (candidate) => candidate.id === item.checklistTemplateId,
                );
                const results = form.checklistResults[item.id] ?? [];
                const readings = form.measurements[item.id] ?? [];
                return (
                  <article className="service-capture" key={item.id}>
                    <header>
                      <div>
                        <span>{item.type}</span>
                        <h3>{item.name}</h3>
                      </div>
                      <strong>{template?.name}</strong>
                    </header>
                    <div className="capture-checklist">
                      {(template?.items ?? []).map((checkItem, index) => (
                        <div key={checkItem}>
                          <p>{checkItem}</p>
                          <select
                            aria-label={`Result for ${checkItem}`}
                            value={results[index]?.result ?? "YES"}
                            onChange={(event) =>
                              updateChecklistResult(
                                item.id,
                                index,
                                "result",
                                event.target.value,
                              )
                            }
                          >
                            <option>YES</option>
                            <option>NO</option>
                            <option>N/A</option>
                          </select>
                          <input
                            aria-label={`Remark for ${checkItem}`}
                            placeholder="Remark (optional)"
                            value={results[index]?.remark ?? ""}
                            onChange={(event) =>
                              updateChecklistResult(
                                item.id,
                                index,
                                "remark",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                    {!!readings.length && (
                      <div className="capture-readings">
                        <span>Equipment readings</span>
                        <div>
                          {readings.map((reading, index) => (
                            <label key={reading.label}>
                              {reading.label}
                              <span>
                                <input
                                  value={reading.value}
                                  onChange={(event) =>
                                    updateMeasurement(
                                      item.id,
                                      index,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Value"
                                />
                                <i>{reading.unit}</i>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="capture-note">
                      Equipment note
                      <input
                        value={form.equipmentNotes[item.id] ?? ""}
                        onChange={(event) =>
                          update("equipmentNotes", {
                            ...form.equipmentNotes,
                            [item.id]: event.target.value,
                          })
                        }
                      />
                    </label>
                  </article>
                );
              })}
              <div className="form-grid">
                <label>
                  Service summary
                  <textarea rows={3} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="Summarize the visit and equipment serviced." />
                </label>
                <fieldset className="work-items">
                  <legend>Work performed</legend>
                  {form.workPerformed.map((item, index) => (
                    <div key={index}>
                      <span>{index + 1}</span>
                      <input value={item} onChange={(event) => {
                        const next = [...form.workPerformed];
                        next[index] = event.target.value;
                        update("workPerformed", next);
                      }} placeholder="Describe one completed activity" />
                      {form.workPerformed.length > 1 && (
                        <button aria-label="Remove work item" onClick={() => update("workPerformed", form.workPerformed.filter((_, itemIndex) => itemIndex !== index))} type="button"><X size={15} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => update("workPerformed", [...form.workPerformed, ""])} type="button"><Plus size={14} /> Add work item</button>
                </fieldset>
                <div className="form-grid two">
                  <label>
                    Remarks
                    <textarea rows={3} value={form.remarks} onChange={(event) => update("remarks", event.target.value)} placeholder="General remarks" />
                  </label>
                  <label>
                    Follow-up
                    <textarea rows={3} value={form.followUp} onChange={(event) => update("followUp", event.target.value)} placeholder="Required follow-up or no follow-up required" />
                  </label>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <FormSectionHeading number="03" title="Technicians and final review" description="The draft can be reviewed again before it is sent." />
              <div className="technician-picker">
                {workspace.technicians.map((item) => {
                  const selected = form.technicianIds.includes(item.id);
                  return (
                    <button className={selected ? "selected" : ""} key={item.id} onClick={() => toggleArray("technicianIds", item.id)} type="button">
                      <span>{selected ? <Check size={16} /> : <UserRound size={16} />}</span>
                      <div><strong>{item.name}</strong><small>{item.designation}</small></div>
                    </button>
                  );
                })}
              </div>
              <div className="report-review-card">
                <header><span>Draft preview</span><strong>New report number assigned on save</strong></header>
                <dl>
                  <div><dt>Client</dt><dd>{selectedClient?.name}</dd></div>
                  <div><dt>Site</dt><dd>{selectedLocation?.name}</dd></div>
                  <div><dt>Service date</dt><dd>{form.serviceDate}</dd></div>
                  <div><dt>Service type</dt><dd>{form.serviceType}</dd></div>
                </dl>
                <section><span>Equipment</span><p>{selectedEquipment.map((item) => item.name).join(", ")}</p></section>
                <section><span>Technicians</span><p>{selectedTechnicians.map((item) => item.name).join(", ") || "Select below"}</p></section>
                <section><span>Summary</span><p>{form.summary}</p></section>
              </div>
              <div className="lock-explainer">
                <ShieldCheck size={18} />
                <p><strong>Signing rule:</strong> the report stays editable as a draft. After a client signs, it becomes locked and the PDF uses that exact signed version.</p>
              </div>
            </>
          )}

          {error && <p className="form-error">{error}</p>}
          <footer className="create-footer">
            <button className="real-secondary-button" disabled={step === 1 || saving} onClick={() => { setStep((current) => current - 1); setError(""); }} type="button"><ArrowLeft size={15} /> Back</button>
            {step < 3 ? (
              <button className="real-primary-button" onClick={next} type="button">Continue <ArrowRight size={15} /></button>
            ) : (
              <button className="real-primary-button" disabled={saving} onClick={createDraft} type="button">
                {saving ? <LoaderCircle className="spin" size={16} /> : <FilePlus2 size={16} />}
                {saving ? "Creating draft…" : "Create draft report"}
              </button>
            )}
          </footer>
        </section>
      </div>
    </>
  );
}

function FormSectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="form-section-heading">
      <span>{number}</span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
  );
}

function MasterData({
  workspace,
  tab,
  onWorkspaceChange,
  onNotice,
}: {
  workspace: WorkspaceSnapshot;
  tab: MasterTab;
  onWorkspaceChange: (workspace: WorkspaceSnapshot) => void;
  onNotice: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [deleting, setDeleting] = useState<MasterRecord | null>(null);

  function saved(
    nextWorkspace: WorkspaceSnapshot,
    action: "created" | "updated",
  ) {
    onWorkspaceChange(nextWorkspace);
    setAdding(false);
    setEditing(null);
    onNotice(`Master data ${action}.`);
  }

  return (
    <>
      <PageHeading
        eyebrow="Reusable operational records"
        title="Master data"
        description="Create the clients, sites, equipment, service checklists, technicians, and service types used when building reports."
        action={
          <button className="real-primary-button" onClick={() => setAdding(true)} type="button">
            <Plus size={17} /> Add {masterSingular(tab)}
          </button>
        }
      />
      <section className="real-panel master-content">
        <MasterList
          tab={tab}
          workspace={workspace}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      </section>
      {adding && (
        <MasterDataDialog
          entity={tab}
          workspace={workspace}
          onClose={() => setAdding(false)}
          onSaved={(nextWorkspace) => saved(nextWorkspace, "created")}
        />
      )}
      {editing && (
        <MasterDataDialog
          entity={tab}
          record={editing}
          workspace={workspace}
          onClose={() => setEditing(null)}
          onSaved={(nextWorkspace) => saved(nextWorkspace, "updated")}
        />
      )}
      {deleting && (
        <DeleteMasterDialog
          entity={tab}
          record={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(nextWorkspace) => {
            onWorkspaceChange(nextWorkspace);
            setDeleting(null);
            onNotice("Master record deleted.");
          }}
        />
      )}
    </>
  );
}

function MasterList({
  tab,
  workspace,
  onEdit,
  onDelete,
}: {
  tab: MasterTab;
  workspace: WorkspaceSnapshot;
  onEdit: (record: MasterRecord) => void;
  onDelete: (record: MasterRecord) => void;
}) {
  const [pageSize, setPageSize] = useState(6);
  const [pageState, setPageState] = useState<{ tab: MasterTab; page: number }>({
    tab,
    page: 1,
  });
  const clientName = (clientId: string) =>
    workspace.clients.find((client) => client.id === clientId)?.name ?? "Unknown client";
  const locationName = (locationId: string) =>
    workspace.locations.find((location) => location.id === locationId)?.name ?? "Unknown site";
  const totalItems =
    tab === "checklist-templates"
      ? workspace.checklistTemplates.length
      : tab === "service-types"
        ? workspace.serviceTypes.length
        : workspace[tab].length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const requestedPage = pageState.tab === tab ? pageState.page : 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagination = (
    <Pagination
      currentPage={currentPage}
      itemLabel={masterTabs.find((item) => item.id === tab)?.label.toLowerCase() ?? "records"}
      onPageChange={(nextPage) => setPageState({ tab, page: nextPage })}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
        setPageState({ tab, page: 1 });
      }}
      pageSize={pageSize}
      pageSizeOptions={[6, 12, 24]}
      totalItems={totalItems}
    />
  );

  if (tab === "clients") {
    return <><div className="master-card-grid">{workspace.clients.slice(pageStart, pageEnd).map((item) => (
      <article key={item.id}><span className="master-icon"><Building2 size={19} /></span><StatusPill active={item.active} /><h2>{item.name}</h2><p>{item.contactName || "No contact recorded"}</p><dl><div><dt>Email</dt><dd>{item.email || "Not recorded"}</dd></div><div><dt>Phone</dt><dd>{item.phone || "Not recorded"}</dd></div><div><dt>Address</dt><dd>{item.address}</dd></div></dl><MasterRecordActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
    ))}</div>{pagination}</>;
  }
  if (tab === "locations") {
    return <><div className="master-card-grid">{workspace.locations.slice(pageStart, pageEnd).map((item) => (
      <article key={item.id}><span className="master-icon"><MapPin size={19} /></span><StatusPill active={item.active} /><span className="record-owner">{clientName(item.clientId)}</span><h2>{item.name}</h2><p>{item.address}</p><div className="record-meta">{workspace.equipment.filter((equipment) => equipment.locationId === item.id).length} equipment records</div><MasterRecordActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
    ))}</div>{pagination}</>;
  }
  if (tab === "equipment") {
    return <><div className="master-table"><div className="master-table-head"><span>Equipment</span><span>Client / site</span><span>Identification</span><span>Checklist</span><span>Actions</span></div>{workspace.equipment.slice(pageStart, pageEnd).map((item) => (
      <article key={item.id}><span><i><Gauge size={16} /></i><b>{item.name}</b><small>{item.type} · {item.active ? "Active" : "Inactive"}</small></span><span><b>{clientName(item.clientId)}</b><small>{locationName(item.locationId)}</small></span><span><b>{item.brand} {item.model}</b><small>Serial: {item.serial}</small></span><span><b>{workspace.checklistTemplates.find((template) => template.id === item.checklistTemplateId)?.name ?? "No template"}</b><small>Loaded into new reports</small></span><MasterRecordActions compact name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
    ))}</div>{pagination}</>;
  }
  if (tab === "checklist-templates") {
    return <><div className="checklist-master-grid">{workspace.checklistTemplates.slice(pageStart, pageEnd).map((item) => (
      <article key={item.id}><header><span><ClipboardCheck size={18} /></span><div><strong>{item.name}</strong><small>{item.equipmentType} · {item.active ? "Active" : "Inactive"}</small></div><i>{item.items.length} checks · {item.measurements.length} readings</i></header><ol>{item.items.slice(0, 4).map((check) => <li key={check}>{check}</li>)}</ol>{item.items.length > 4 && <p>+ {item.items.length - 4} more checklist items</p>}<MasterRecordActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
    ))}</div>{pagination}</>;
  }
  if (tab === "service-types") {
    return <><div className="master-card-grid service-types">{workspace.serviceTypes.slice(pageStart, pageEnd).map((item) => (
      <article key={item.id}><span className="master-icon"><Tag size={19} /></span><StatusPill active={item.active} /><h2>{item.name}</h2><p>{item.description || "No description recorded"}</p><div className="record-meta">Available in report creation</div><MasterRecordActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
    ))}</div>{pagination}</>;
  }
  return <><div className="master-card-grid technicians">{workspace.technicians.slice(pageStart, pageEnd).map((item) => (
    <article key={item.id}><span className="master-avatar">{item.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><StatusPill active={item.active} /><h2>{item.name}</h2><p>{item.designation}</p><dl><div><dt>Email</dt><dd>{item.email || "Not recorded"}</dd></div><div><dt>Phone</dt><dd>{item.phone || "Not recorded"}</dd></div></dl><MasterRecordActions name={item.name} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /></article>
  ))}</div>{pagination}</>;
}

function Pagination({
  currentPage,
  itemLabel,
  onPageChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions,
  totalItems,
}: {
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  totalItems: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="table-pagination" aria-label={`${itemLabel} pagination`}>
      <span className="pagination-summary">
        Showing {firstItem}–{lastItem} of {totalItems} {itemLabel}
      </span>
      <label>
        Items per page
        <select
          aria-label={`Items per page for ${itemLabel}`}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <div className="pagination-controls">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Previous
        </button>
        <div className="pagination-pages" aria-label="Page numbers">
          {pages.map((pageNumber) => (
            <button
              aria-current={pageNumber === currentPage ? "page" : undefined}
              className={pageNumber === currentPage ? "active" : ""}
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`master-active ${active ? "" : "inactive"}`}><span /> {active ? "Active" : "Inactive"}</span>;
}

function MasterRecordActions({
  name,
  onEdit,
  onDelete,
  compact = false,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`master-record-actions ${compact ? "compact" : ""}`}>
      <button aria-label={`Edit ${name}`} onClick={onEdit} type="button"><PencilLine size={14} /> Edit</button>
      <button aria-label={`Delete ${name}`} className="danger" onClick={onDelete} type="button"><Trash2 size={14} /> Delete</button>
    </div>
  );
}

function MasterDataDialog({
  entity,
  record,
  workspace,
  onClose,
  onSaved,
}: {
  entity: MasterEntity;
  record?: MasterRecord;
  workspace: WorkspaceSnapshot;
  onClose: () => void;
  onSaved: (workspace: WorkspaceSnapshot) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!record) {
      return entity === "technicians"
        ? { designation: "Service Technician" }
        : {};
    }
    const initial: Record<string, string> = {
      name: record.name,
      active: String(record.active),
    };
    if ("clientId" in record) initial.clientId = record.clientId;
    if ("locationId" in record) initial.locationId = record.locationId;
    if ("contactName" in record) {
      initial.contactName = record.contactName;
      initial.email = record.email;
      initial.phone = record.phone;
      initial.address = record.address;
    }
    if ("address" in record && !("contactName" in record)) {
      initial.address = record.address;
    }
    if ("checklistTemplateId" in record) {
      initial.type = record.type;
      initial.brand = record.brand;
      initial.model = record.model;
      initial.serial = record.serial;
      initial.checklistTemplateId = record.checklistTemplateId;
    }
    if ("items" in record) {
      initial.equipmentType = record.equipmentType;
      initial.items = record.items.join("\n");
      initial.measurements = record.measurements
        .map((item) => `${item.label}${item.unit ? ` | ${item.unit}` : ""}`)
        .join("\n");
    }
    if ("designation" in record) {
      initial.designation = record.designation;
      initial.email = record.email;
      initial.phone = record.phone;
    }
    if ("description" in record) initial.description = record.description;
    return initial;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const singular = masterSingular(entity);

  function field(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const commonPayload = {
        ...form,
        active: form.active !== "false",
      };
      const payload =
        entity === "checklist-templates"
          ? {
              ...commonPayload,
              items: (form.items ?? "")
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
              measurements: (form.measurements ?? "")
                .split("\n")
                .map((line) => {
                  const [label, unit = ""] = line.split("|");
                  return { label: label.trim(), unit: unit.trim() };
                })
                .filter((item) => item.label),
            }
          : commonPayload;
      const response = await fetch(
        record
          ? `/api/master/${entity}/${encodeURIComponent(record.id)}`
          : `/api/master/${entity}`,
        {
        method: record ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as
        | WorkspaceSnapshot
        | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "Unable to save");
      }
      onSaved(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  const selectedClientLocations = workspace.locations.filter(
    (item) => !form.clientId || item.clientId === form.clientId,
  );

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="master-dialog-title">
      <button className="modal-scrim" aria-label="Close" onClick={onClose} type="button" />
      <form className="form-dialog" onSubmit={save}>
        <header><div><span>Master data</span><h2 id="master-dialog-title">{record ? "Edit" : "Add"} {singular}</h2></div><button aria-label="Close" onClick={onClose} type="button"><X size={19} /></button></header>
        <div className="dialog-body form-grid">
          {record && (
            <label>Record status<select value={form.active ?? "true"} onChange={(event) => field("active", event.target.value)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
          )}
          {(entity === "locations" || entity === "equipment") && (
            <label>Client<select required value={form.clientId ?? ""} onChange={(event) => { field("clientId", event.target.value); field("locationId", ""); }}><option value="">Select client</option>{workspace.clients.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (Inactive)"}</option>)}</select></label>
          )}
          {entity === "equipment" && (
            <label>Service site<select required value={form.locationId ?? ""} onChange={(event) => field("locationId", event.target.value)}><option value="">Select site</option>{selectedClientLocations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.active ? "" : " (Inactive)"}</option>)}</select></label>
          )}
          <label>{entity === "clients" ? "Client name" : entity === "locations" ? "Site name" : entity === "equipment" ? "Equipment name / tag" : entity === "checklist-templates" ? "Template name" : entity === "service-types" ? "Service type name" : "Technician name"}<input required value={form.name ?? ""} onChange={(event) => field("name", event.target.value)} /></label>
          {entity === "clients" && <>
            <label>Primary contact<input value={form.contactName ?? ""} onChange={(event) => field("contactName", event.target.value)} /></label>
            <div className="form-grid two"><label>Email<input type="email" value={form.email ?? ""} onChange={(event) => field("email", event.target.value)} /></label><label>Phone<input value={form.phone ?? ""} onChange={(event) => field("phone", event.target.value)} /></label></div>
            <label>Client address<textarea required rows={3} value={form.address ?? ""} onChange={(event) => field("address", event.target.value)} /></label>
          </>}
          {entity === "locations" && <label>Site address<textarea required rows={3} value={form.address ?? ""} onChange={(event) => field("address", event.target.value)} /></label>}
          {entity === "equipment" && <>
            <label>Equipment type<input required value={form.type ?? ""} onChange={(event) => field("type", event.target.value)} placeholder="e.g. Air Handling Unit" /></label>
            <div className="form-grid three"><label>Brand<input value={form.brand ?? ""} onChange={(event) => field("brand", event.target.value)} /></label><label>Model<input value={form.model ?? ""} onChange={(event) => field("model", event.target.value)} /></label><label>Serial number<input value={form.serial ?? ""} onChange={(event) => field("serial", event.target.value)} /></label></div>
            <label>Checklist template<select required value={form.checklistTemplateId ?? ""} onChange={(event) => field("checklistTemplateId", event.target.value)}><option value="">Select checklist</option>{workspace.checklistTemplates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.equipmentType}{item.active ? "" : " (Inactive)"}</option>)}</select></label>
          </>}
          {entity === "checklist-templates" && <>
            <label>Equipment type<input required value={form.equipmentType ?? ""} onChange={(event) => field("equipmentType", event.target.value)} placeholder="e.g. Air Curtain" /></label>
            <label>Checklist items <small>One item per line</small><textarea required rows={9} value={form.items ?? ""} onChange={(event) => field("items", event.target.value)} placeholder={"Check motor operation\nClean housing and fan blades\nTest controller response"} /></label>
            <label>Measurement definitions <small>Optional · one per line as Label | Unit</small><textarea rows={5} value={form.measurements ?? ""} onChange={(event) => field("measurements", event.target.value)} placeholder={"R-phase current | A\nOff-coil temperature | °C"} /></label>
          </>}
          {entity === "technicians" && <>
            <label>Designation<input required value={form.designation ?? "Service Technician"} onChange={(event) => field("designation", event.target.value)} /></label>
            <div className="form-grid two"><label>Email<input type="email" value={form.email ?? ""} onChange={(event) => field("email", event.target.value)} /></label><label>Phone<input value={form.phone ?? ""} onChange={(event) => field("phone", event.target.value)} /></label></div>
          </>}
          {entity === "service-types" && (
            <label>Description<textarea rows={3} value={form.description ?? ""} onChange={(event) => field("description", event.target.value)} placeholder="Where this service type should be used" /></label>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer><button className="real-secondary-button" onClick={onClose} type="button">Cancel</button><button className="real-primary-button" disabled={saving} type="submit">{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{saving ? "Saving…" : record ? `Update ${singular}` : `Save ${singular}`}</button></footer>
      </form>
    </div>
  );
}

function DeleteMasterDialog({
  entity,
  record,
  onClose,
  onDeleted,
}: {
  entity: MasterEntity;
  record: MasterRecord;
  onClose: () => void;
  onDeleted: (workspace: WorkspaceSnapshot) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/master/${entity}/${encodeURIComponent(record.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as
        | WorkspaceSnapshot
        | { error: string };
      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result ? result.error : "Unable to delete record",
        );
      }
      onDeleted(result);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete record",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="delete-master-title">
      <button className="modal-scrim" aria-label="Close" onClick={onClose} type="button" />
      <section className="delete-master-dialog">
        <span className="delete-master-icon"><AlertTriangle size={23} /></span>
        <span>Delete master record</span>
        <h2 id="delete-master-title">Delete “{record.name}”?</h2>
        <p>This permanently removes the record from master data. If it is linked to equipment or a historical report, deletion will be blocked so signed records remain intact.</p>
        {error && <p className="form-error">{error}</p>}
        <footer>
          <button className="real-secondary-button" onClick={onClose} type="button">Cancel</button>
          <button className="danger-button" disabled={deleting} onClick={() => void remove()} type="button">{deleting ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}{deleting ? "Deleting…" : "Delete record"}</button>
        </footer>
      </section>
    </div>
  );
}

function ReportDetail({
  company,
  report,
  onClose,
  onGenerate,
  onSend,
  onSignHere,
}: {
  company: CompanyProfile;
  report: WorkspaceReport;
  onClose: () => void;
  onGenerate: (report: WorkspaceReport) => void;
  onSend: (report: WorkspaceReport) => void;
  onSignHere: (report: WorkspaceReport) => void;
}) {
  const [equipmentIndex, setEquipmentIndex] = useState(0);
  const equipment = report.equipment[equipmentIndex];
  return (
    <div className="detail-layer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button className="detail-scrim" aria-label="Close report" onClick={onClose} type="button" />
      <section className="report-detail operational-detail">
        <header className="detail-header">
          <div><button onClick={onClose} type="button"><ArrowLeft size={16} /> Back to reports</button><span>Service Report / Delivery Order</span><h2 id="detail-title">Report #{report.id}</h2></div>
          <button className="detail-close" aria-label="Close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="detail-actionbar">
          <StatusBadge status={report.status} />
          <span className={`real-status ${report.condition === "Follow-up required" ? "follow" : ""}`}>{report.condition === "Follow-up required" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{report.condition}</span>
          <span />
          {report.sourceDocument && <a href={report.sourceDocument.href} target="_blank" rel="noreferrer"><Eye size={16} /> Original source</a>}
          {report.status === "Draft" && <button className="action-link-button" onClick={() => onSend(report)} type="button"><Send size={16} /> Send to client</button>}
          {report.status === "Awaiting client signature" && <button className="action-link-button" onClick={() => onSend(report)} type="button"><Link2 size={16} /> New client link</button>}
          {report.status === "Awaiting client signature" && <button className="real-primary-button" onClick={() => onSignHere(report)} type="button"><Signature size={16} /> Sign on this device</button>}
          {report.status === "Completed" && <button className="real-primary-button" onClick={() => onGenerate(report)} type="button"><Download size={16} /> Signed PDF</button>}
        </div>
        <div className="detail-scroll">
          <section className="report-identity">
            <div className="identity-mark">
              <Image
                alt="Promach"
                height={36}
                src="/brand/promach-logo.png"
                width={36}
              />
            </div>
            <div><span>{company.name}</span><strong>{report.client}</strong><small><MapPin size={13} /> {report.address}</small></div>
            <dl><div><dt>Report date</dt><dd>{report.date}</dd></div><div><dt>Service month</dt><dd>{report.serviceMonth}</dd></div><div><dt>Service type</dt><dd>{report.serviceType}</dd></div></dl>
          </section>
          <section className="detail-section"><span className="detail-section-number">01</span><div><h3>Service summary</h3><p>{report.summary}</p><ul>{report.workPerformed.map((item) => <li key={item}><Check size={14} /> {item}</li>)}</ul></div></section>
          <section className="detail-section equipment-detail-section"><span className="detail-section-number">02</span><div><h3>Equipment and checklist</h3><div className="equipment-tabs">{report.equipment.map((item, index) => <button className={index === equipmentIndex ? "active" : ""} key={item.id} onClick={() => setEquipmentIndex(index)} type="button">{item.name}</button>)}</div>{equipment && <div className="selected-equipment"><div className="selected-equipment-head"><div><span>{equipment.type}</span><h4>{equipment.name}</h4><p>{equipment.location}</p></div></div><dl><div><dt>Brand</dt><dd>{equipment.brand}</dd></div><div><dt>Model</dt><dd>{equipment.model}</dd></div><div><dt>Serial</dt><dd>{equipment.serial}</dd></div></dl><div className="detail-checklist">{equipment.checklist.map((item, index) => { const result = equipment.checklistResults?.[index]?.result ?? "YES"; return <span className={result === "NO" ? "failed" : result === "N/A" ? "na" : ""} key={item}><Check size={14} /><p>{item}{equipment.checklistResults?.[index]?.remark && <small>{equipment.checklistResults[index].remark}</small>}</p><strong>{result}</strong></span>; })}</div>{!!equipment.measurements.length && <div className="detail-measurements">{equipment.measurements.map((measurement) => <span key={measurement.label}><small>{measurement.label}</small><strong>{measurement.value || "Not recorded"} {measurement.unit}</strong></span>)}</div>}<div className={`equipment-note ${equipment.note.toLowerCase().includes("chemical") ? "warning" : ""}`}><CheckCircle2 size={17} />{equipment.note}</div></div>}</div></section>
          <section className="detail-section"><span className="detail-section-number">03</span><div><h3>Completion and acknowledgement</h3><div className="completion-grid"><article><Wrench size={18} /><span>Completed by</span><strong>{report.technicians.join(", ")}</strong></article><article><ShieldCheck size={18} /><span>Customer acknowledgement</span><strong>{report.signature?.signerName ?? "Awaiting client signature"}</strong><small>{report.signature ? `${report.signature.designation} · ${report.acknowledgement.signedDate}` : "Not yet signed"}</small></article></div>{report.signature && <div className="signature-proof"><Signature size={18} /><div><strong>Digitally signed</strong><span>{report.signature.channel === "client_portal" ? "Secure client link" : report.signature.channel === "admin_device" ? "Promach admin device" : "Original source document"} · {new Date(report.signature.signedAt).toLocaleString("en-SG")}</span></div><LockKey /></div>}</div></section>
          <section className="detail-section audit-section"><span className="detail-section-number">04</span><div><h3>Audit history</h3><div className="audit-list">{report.auditTrail.map((event) => <article key={event.id}><span><History size={15} /></span><div><strong>{event.action}</strong><p>{event.detail}</p><small>{event.actorName} · {event.channel.replaceAll("_", " ")} · {new Date(event.createdAt).toLocaleString("en-SG")}</small></div></article>)}</div></div></section>
        </div>
      </section>
    </div>
  );
}

function LockKey() {
  return <ShieldCheck size={17} />;
}

function ShareDialog({
  state,
  onClose,
  onNotice,
}: {
  state: { report: WorkspaceReport; url: string };
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  async function copy() {
    await navigator.clipboard.writeText(state.url);
    onNotice("Secure client link copied.");
  }
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <button className="modal-scrim" aria-label="Close" onClick={onClose} type="button" />
      <section className="share-dialog">
        <span className="dialog-success-icon"><Send size={24} /></span>
        <span>Report ready for client</span>
        <h2 id="share-title">Share report #{state.report.id}</h2>
        <p>This private link opens only this report and lets the client review and sign it. Creating a new link replaces the previous one.</p>
        <label>Secure signing link<div><input readOnly value={state.url} /><button onClick={copy} type="button"><Copy size={16} /> Copy</button></div></label>
        <div className="share-recipient"><Building2 size={17} /><div><strong>{state.report.client}</strong><span>{state.report.address}</span></div></div>
        <footer><button className="real-secondary-button" onClick={onClose} type="button">Done</button><a className="real-primary-button" href={state.url} target="_blank" rel="noreferrer"><Eye size={16} /> Preview client view</a></footer>
      </section>
    </div>
  );
}

function AdminSignatureDialog({
  report,
  onClose,
  onSigned,
}: {
  report: WorkspaceReport;
  onClose: () => void;
  onSigned: (workspace: WorkspaceSnapshot) => void;
}) {
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function sign(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${report.id}/sign-admin`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signerName, signerEmail, designation, signatureDataUrl, consent }),
      });
      const payload = (await response.json()) as { workspace: WorkspaceSnapshot } | { error: string };
      if (!response.ok || !("workspace" in payload)) throw new Error("error" in payload ? payload.error : "Unable to sign report");
      onSigned(payload.workspace);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign report");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-layer signature-modal" role="dialog" aria-modal="true" aria-labelledby="admin-sign-title">
      <button className="modal-scrim" aria-label="Close" onClick={onClose} type="button" />
      <form className="form-dialog signature-dialog" onSubmit={sign}>
        <header><div><span>Admin-device signature</span><h2 id="admin-sign-title">Client acknowledgement · Report #{report.id}</h2></div><button aria-label="Close" onClick={onClose} type="button"><X size={19} /></button></header>
        <div className="dialog-body">
          <div className="admin-sign-context"><Building2 size={17} /><div><strong>{report.client}</strong><span>{report.address} · {report.date}</span></div><StatusBadge status={report.status} /></div>
          <p className="admin-sign-note">Hand this device to the client representative. The audit trail will record that the signature was collected on a Promach admin device.</p>
          <div className="form-grid two">
            <label>Client representative<input required value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label>
            <label>Designation<input required value={designation} onChange={(event) => setDesignation(event.target.value)} /></label>
            <label className="span-two">Email<input required type="email" value={signerEmail} onChange={(event) => setSignerEmail(event.target.value)} /></label>
          </div>
          <SignaturePad onChange={setSignatureDataUrl} />
          <label className="signature-consent"><input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" /><span>I confirm that the service work in report #{report.id} has been completed to our satisfaction and I agree to this digital acknowledgement.</span></label>
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer><button className="real-secondary-button" onClick={onClose} type="button">Cancel</button><button className="real-primary-button" disabled={saving || !signatureDataUrl || !consent} type="submit">{saving ? <LoaderCircle className="spin" size={16} /> : <Signature size={16} />}{saving ? "Completing report…" : "Sign and complete report"}</button></footer>
      </form>
    </div>
  );
}
