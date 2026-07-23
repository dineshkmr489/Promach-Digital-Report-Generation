"use client";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Gauge,
  HardHat,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Role = "admin" | "client";
type View =
  | "dashboard"
  | "reports"
  | "new-report"
  | "masters"
  | "technicians"
  | "settings";
type ReportStatus = "Draft" | "Awaiting signature" | "Completed" | "Correction required";

type Report = {
  id: string;
  client: string;
  site: string;
  equipment: string;
  type: string;
  date: string;
  technician: string;
  status: ReportStatus;
};

const reports: Report[] = [
  {
    id: "SR-2026-0084",
    client: "Changi General Hospital",
    site: "Level 2 · AHU Room",
    equipment: "AHU-02 · Daikin",
    type: "Regular Service",
    date: "23 Jul 2026",
    technician: "Nasir Majid",
    status: "Awaiting signature",
  },
  {
    id: "SR-2026-0083",
    client: "Tuas Power Generation",
    site: "Turbine Building · L1",
    equipment: "Air Curtain AC-04",
    type: "Complaint",
    date: "22 Jul 2026",
    technician: "Daniel Tan",
    status: "Completed",
  },
  {
    id: "SR-2026-0082",
    client: "Northpoint City",
    site: "Loading Bay · B2",
    equipment: "Pre-Cool Unit PCU-03",
    type: "Warranty Service",
    date: "21 Jul 2026",
    technician: "Arun Kumar",
    status: "Draft",
  },
  {
    id: "SR-2026-0081",
    client: "Changi General Hospital",
    site: "Pharmacy Entrance · L1",
    equipment: "Air Curtain AC-01",
    type: "Regular Service",
    date: "20 Jul 2026",
    technician: "Nasir Majid",
    status: "Completed",
  },
  {
    id: "SR-2026-0080",
    client: "Sentosa Cove Resort",
    site: "Plant Room · Tower B",
    equipment: "AHU-11 · Carrier",
    type: "Regular Service",
    date: "18 Jul 2026",
    technician: "Daniel Tan",
    status: "Correction required",
  },
];

const navItems: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", label: "Overview", icon: LayoutDashboard },
  { view: "reports", label: "Service reports", icon: FileText },
  { view: "new-report", label: "Create report", icon: FilePlus2 },
  { view: "masters", label: "Master data", icon: Building2 },
  { view: "technicians", label: "Technicians", icon: HardHat },
];

const clientNavItems: typeof navItems = [
  { view: "dashboard", label: "Overview", icon: LayoutDashboard },
  { view: "reports", label: "My reports", icon: FileText },
  { view: "settings", label: "My profile", icon: Settings },
];

const checklistItems = [
  "Check filter manometer",
  "Clean or replace air filter",
  "Flush and clean cooling coil",
  "Clean fan motor and blower",
  "Check actuator operation",
  "Lubricate motor bearings",
];

export function DigitalServiceApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [toast, setToast] = useState("");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function signIn(selectedRole: Role) {
    setRole(selectedRole);
    setView("dashboard");
    setLoggedIn(true);
  }

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  if (!loggedIn) {
    return <LoginScreen role={role} setRole={setRole} onSignIn={signIn} />;
  }

  const visibleNav = role === "admin" ? navItems : clientNavItems;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            P
          </div>
          <div>
            <strong>Promach</strong>
            <span>Digital service reports</span>
          </div>
        </div>

        <div className="workspace-switcher">
          <span className="eyebrow">Workspace</span>
          <button type="button">
            <span className="workspace-icon">
              {role === "admin" ? <Wrench size={17} /> : <Building2 size={17} />}
            </span>
            <span>
              <strong>{role === "admin" ? "Service Operations" : "Client Portal"}</strong>
              <small>{role === "admin" ? "Admin workspace" : "CGH account"}</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.view ? "active" : ""}
                key={item.view}
                onClick={() => navigate(item.view)}
                type="button"
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.view === "reports" && (
                  <span className="nav-count">{role === "admin" ? 12 : 3}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span className="card-spark">
            <Sparkles size={15} />
          </span>
          <strong>Need a quick report?</strong>
          <p>Start from saved equipment and checklist details.</p>
          <button type="button" onClick={() => navigate("new-report")}>
            Create report <ArrowRight size={15} />
          </button>
        </div>

        <div className="sidebar-footer">
          <button type="button" onClick={() => navigate("settings")}>
            <Settings size={18} />
            Settings
          </button>
          <button type="button" onClick={() => setLoggedIn(false)}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="menu-scrim"
          aria-label="Close navigation"
          type="button"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="mobile-brand">Promach DSR</div>
            <label className="global-search">
              <Search size={18} />
              <input
                aria-label="Search reports, clients, or equipment"
                placeholder="Search reports, clients, equipment…"
              />
              <kbd>⌘ K</kbd>
            </label>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-divider" />
            <button className="profile-button" type="button">
              <span className="avatar">{role === "admin" ? "DK" : "NM"}</span>
              <span>
                <strong>{role === "admin" ? "Dinesh Kumar" : "Nasir Majid"}</strong>
                <small>{role === "admin" ? "Operations Admin" : "Client Representative"}</small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <div className="page-container">
          {view === "dashboard" &&
            (role === "admin" ? (
              <AdminDashboard
                onNavigate={navigate}
                onOpenReport={setActiveReport}
              />
            ) : (
              <ClientDashboard
                onOpenReport={setActiveReport}
                onSign={(report) => {
                  setActiveReport(report);
                  setSignatureOpen(true);
                }}
              />
            ))}
          {view === "reports" && (
            <ReportsPage
              role={role}
              onOpenReport={setActiveReport}
              onCreate={() => navigate("new-report")}
            />
          )}
          {view === "new-report" &&
            (role === "admin" ? (
              <CreateReport onDone={notify} />
            ) : (
              <ClientDashboard
                onOpenReport={setActiveReport}
                onSign={(report) => {
                  setActiveReport(report);
                  setSignatureOpen(true);
                }}
              />
            ))}
          {view === "masters" && <MasterData onNotify={notify} />}
          {view === "technicians" && <TechniciansPage onNotify={notify} />}
          {view === "settings" && <SettingsPage role={role} onNotify={notify} />}
        </div>
      </main>

      <nav className="mobile-dock" aria-label="Mobile navigation">
        {visibleNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              className={view === item.view ? "active" : ""}
              key={item.view}
              onClick={() => navigate(item.view)}
            >
              <Icon size={20} />
              <span>{item.label.replace("Service ", "")}</span>
            </button>
          );
        })}
      </nav>

      {activeReport && (
        <ReportDrawer
          report={activeReport}
          role={role}
          onClose={() => setActiveReport(null)}
          onSign={() => setSignatureOpen(true)}
        />
      )}

      {signatureOpen && activeReport && (
        <SignatureModal
          report={activeReport}
          onClose={() => setSignatureOpen(false)}
          onSubmit={() => {
            setSignatureOpen(false);
            setActiveReport(null);
            notify(`${activeReport.id} signed and submitted successfully.`);
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function LoginScreen({
  role,
  setRole,
  onSignIn,
}: {
  role: Role;
  setRole: (role: Role) => void;
  onSignIn: (role: Role) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <span className="brand-mark">P</span>
          <span>
            <strong>Promach</strong>
            <small>Digital service reports</small>
          </span>
        </div>

        <div className="login-copy">
          <span className="login-kicker">
            <span />
            Field service, without the paperwork
          </span>
          <h1>
            Every service visit.
            <br />
            <em>Clear, signed, complete.</em>
          </h1>
          <p>
            Create professional equipment service reports, collect customer
            acknowledgement, and keep every record audit-ready.
          </p>
          <div className="login-benefits">
            <span>
              <CheckCircle2 size={17} /> Equipment-based checklists
            </span>
            <span>
              <CheckCircle2 size={17} /> Secure digital signatures
            </span>
            <span>
              <CheckCircle2 size={17} /> Instant, print-ready PDFs
            </span>
          </div>
        </div>

        <div className="floating-report">
          <div className="floating-report-top">
            <span className="report-file-icon">
              <FileCheck2 size={22} />
            </span>
            <div>
              <span>Service report</span>
              <strong>SR-2026-0084</strong>
            </div>
            <span className="status-badge status-awaiting">Awaiting signature</span>
          </div>
          <div className="floating-report-grid">
            <span>
              <small>Client</small>
              <strong>Changi General Hospital</strong>
            </span>
            <span>
              <small>Equipment</small>
              <strong>AHU-02 · Daikin</strong>
            </span>
            <span>
              <small>Service date</small>
              <strong>23 Jul 2026</strong>
            </span>
          </div>
          <div className="floating-progress">
            <span>
              <Check size={13} /> Service complete
            </span>
            <span>
              <Check size={13} /> Technician signed
            </span>
            <span className="current">Customer review</span>
          </div>
        </div>

        <div className="login-trust">
          <ShieldCheck size={18} />
          <span>Role-based access</span>
          <span className="dot-separator" />
          <span>Complete audit trail</span>
          <span className="dot-separator" />
          <span>Encrypted records</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="mobile-login-brand">
            <span className="brand-mark">P</span>
            <strong>Promach DSR</strong>
          </span>
          <div className="login-heading">
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Manage and approve service records in one secure place.</p>
          </div>

          <div className="role-tabs" role="tablist" aria-label="Choose account type">
            <button
              type="button"
              className={role === "admin" ? "active" : ""}
              onClick={() => setRole("admin")}
            >
              <Wrench size={17} /> Admin
            </button>
            <button
              type="button"
              className={role === "client" ? "active" : ""}
              onClick={() => setRole("client")}
            >
              <Building2 size={17} /> Client
            </button>
          </div>

          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSignIn(role);
            }}
          >
            <label>
              Work email
              <span className="input-shell">
                <Mail size={18} />
                <input
                  type="email"
                  defaultValue={role === "admin" ? "admin@promach.com" : "facilities@cgh.com"}
                  required
                />
              </span>
            </label>
            <label>
              <span className="label-row">
                Password <button type="button">Forgot password?</button>
              </span>
              <span className="input-shell">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  defaultValue="promach2026"
                  required
                />
                <button
                  className="show-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>
            <label className="remember-row">
              <input type="checkbox" defaultChecked />
              <span>Keep me signed in on this device</span>
            </label>
            <button className="primary-button login-submit" type="submit">
              Sign in as {role === "admin" ? "Admin" : "Client"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="demo-note">
            <Sparkles size={17} />
            <p>
              <strong>Interactive preview</strong>
              Use the pre-filled demo account to explore this workspace.
            </p>
          </div>
        </div>
        <p className="login-legal">
          Protected by enterprise-grade security · Privacy · Support
        </p>
      </section>
    </main>
  );
}

function AdminDashboard({
  onNavigate,
  onOpenReport,
}: {
  onNavigate: (view: View) => void;
  onOpenReport: (report: Report) => void;
}) {
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Thursday, 23 July</span>
          <h1>Good morning, Dinesh.</h1>
          <p>Here&apos;s what needs your attention across service operations.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => onNavigate("new-report")}
        >
          <Plus size={18} /> New service report
        </button>
      </div>

      <section className="metric-grid" aria-label="Report summary">
        <MetricCard
          icon={FileText}
          label="Total reports"
          value="146"
          note="+12 this month"
          tone="green"
        />
        <MetricCard
          icon={PenLine}
          label="Draft reports"
          value="08"
          note="3 need attention"
          tone="blue"
        />
        <MetricCard
          icon={Clock3}
          label="Awaiting signatures"
          value="12"
          note="4 over 48 hours"
          tone="amber"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed"
          value="126"
          note="86% completion rate"
          tone="purple"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Report activity</h2>
              <p>Monthly service reports created and completed</p>
            </div>
            <button className="filter-button" type="button">
              Last 6 months <ChevronDown size={15} />
            </button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-created" /> Created</span>
            <span><i className="legend-completed" /> Completed</span>
          </div>
          <div className="bar-chart" aria-label="Report activity chart">
            {[
              ["Feb", 48, 36],
              ["Mar", 61, 50],
              ["Apr", 45, 41],
              ["May", 75, 59],
              ["Jun", 68, 64],
              ["Jul", 88, 72],
            ].map(([month, created, complete]) => (
              <div className="bar-group" key={month}>
                <div className="bars">
                  <span style={{ height: `${created}%` }} />
                  <span style={{ height: `${complete}%` }} />
                </div>
                <small>{month}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>Needs attention</h2>
              <p>Reports requiring an action</p>
            </div>
            <span className="attention-count">7</span>
          </div>
          <div className="attention-list">
            <button type="button" onClick={() => onOpenReport(reports[0])}>
              <span className="attention-icon amber"><Clock3 size={18} /></span>
              <span>
                <strong>Signature overdue</strong>
                <small>SR-2026-0076 · Tuas Power</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button type="button" onClick={() => onOpenReport(reports[4])}>
              <span className="attention-icon red"><CircleAlert size={18} /></span>
              <span>
                <strong>Correction requested</strong>
                <small>SR-2026-0080 · Sentosa Cove</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button type="button" onClick={() => onOpenReport(reports[2])}>
              <span className="attention-icon blue"><PenLine size={18} /></span>
              <span>
                <strong>Incomplete draft</strong>
                <small>SR-2026-0082 · Northpoint City</small>
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
          <button className="text-button attention-all" type="button" onClick={() => onNavigate("reports")}>
            View all action items <ArrowRight size={15} />
          </button>
        </article>
      </section>

      <RecentReports onOpenReport={onOpenReport} onNavigate={onNavigate} />
    </>
  );
}

function MetricCard({
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
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <button type="button" aria-label={`More options for ${label}`}>
        <MoreHorizontal size={19} />
      </button>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone === "amber" ? "warning-note" : ""}>
        {tone !== "amber" && <Activity size={13} />}
        {note}
      </small>
    </article>
  );
}

function RecentReports({
  onOpenReport,
  onNavigate,
}: {
  onOpenReport: (report: Report) => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <article className="panel reports-panel">
      <div className="panel-heading">
        <div>
          <h2>Recent service reports</h2>
          <p>The latest activity across all client sites</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => onNavigate("reports")}>
          View all reports <ArrowRight size={15} />
        </button>
      </div>
      <ReportTable data={reports.slice(0, 4)} onOpenReport={onOpenReport} />
    </article>
  );
}

function ReportsPage({
  role,
  onOpenReport,
  onCreate,
}: {
  role: Role;
  onOpenReport: (report: Report) => void;
  onCreate: () => void;
}) {
  const [tab, setTab] = useState("All reports");
  const [search, setSearch] = useState("");
  const roleReports =
    role === "client"
      ? reports.filter((report) => report.client === "Changi General Hospital")
      : reports;
  const filtered = roleReports.filter((report) => {
    const matchesSearch = `${report.id} ${report.client} ${report.equipment}`
      .toLowerCase()
      .includes(search.toLowerCase());
    if (tab === "All reports") return matchesSearch;
    if (tab === "Awaiting signature")
      return matchesSearch && report.status === "Awaiting signature";
    return matchesSearch && report.status === tab.replace(" reports", "");
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{role === "admin" ? "Operations" : "Client portal"}</span>
          <h1>{role === "admin" ? "Service reports" : "My service reports"}</h1>
          <p>
            {role === "admin"
              ? "Create, track, and manage every service record."
              : "Review pending work and access your completed reports."}
          </p>
        </div>
        {role === "admin" && (
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={18} /> Create report
          </button>
        )}
      </div>

      <article className="panel reports-page-panel">
        <div className="report-tabs">
          {["All reports", "Draft reports", "Awaiting signature", "Completed reports"].map(
            (item) => (
              <button
                className={tab === item ? "active" : ""}
                key={item}
                type="button"
                onClick={() => setTab(item)}
              >
                {item}
                <span>
                  {item === "All reports"
                    ? roleReports.length
                    : item === "Draft reports"
                      ? 1
                      : item === "Awaiting signature"
                        ? role === "admin" ? 12 : 1
                        : role === "admin" ? 126 : 2}
                </span>
              </button>
            ),
          )}
        </div>
        <div className="report-toolbar">
          <label className="table-search">
            <Search size={17} />
            <input
              placeholder="Search by report, client, equipment…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div>
            <button className="secondary-button" type="button">
              <CalendarDays size={16} /> Date
            </button>
            <button className="secondary-button" type="button">
              <ListFilter size={16} /> Filters
            </button>
          </div>
        </div>
        <ReportTable data={filtered} onOpenReport={onOpenReport} />
      </article>
    </>
  );
}

function ReportTable({
  data,
  onOpenReport,
}: {
  data: Report[];
  onOpenReport: (report: Report) => void;
}) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <Search size={24} />
        <strong>No matching reports</strong>
        <span>Try changing the search or status filter.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Report</th>
            <th>Client & location</th>
            <th>Equipment</th>
            <th>Service date</th>
            <th>Status</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {data.map((report) => (
            <tr key={report.id} onClick={() => onOpenReport(report)}>
              <td data-label="Report">
                <strong>{report.id}</strong>
                <small>{report.type}</small>
              </td>
              <td data-label="Client">
                <strong>{report.client}</strong>
                <small>{report.site}</small>
              </td>
              <td data-label="Equipment">
                <strong>{report.equipment}</strong>
                <small>Serviced by {report.technician}</small>
              </td>
              <td data-label="Date">{report.date}</td>
              <td data-label="Status">
                <StatusBadge status={report.status} />
              </td>
              <td>
                <button
                  className="table-action"
                  aria-label={`Open ${report.id}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenReport(report);
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const className = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${className}`}>{status}</span>;
}

function ClientDashboard({
  onOpenReport,
  onSign,
}: {
  onOpenReport: (report: Report) => void;
  onSign: (report: Report) => void;
}) {
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Client portal · Changi General Hospital</span>
          <h1>Welcome back, Nasir.</h1>
          <p>Review service work and keep your facility records up to date.</p>
        </div>
        <button className="secondary-button" type="button">
          <Download size={17} /> Export history
        </button>
      </div>

      <section className="client-summary">
        <article className="client-primary-metric">
          <div>
            <span className="metric-icon amber"><PenLine size={22} /></span>
            <span>Awaiting your signature</span>
          </div>
          <strong>03</strong>
          <p>Please review and sign to complete these service records.</p>
        </article>
        <article>
          <span>Completed reports</span>
          <strong>28</strong>
          <small><Activity size={14} /> 6 this month</small>
        </article>
        <article>
          <span>Active locations</span>
          <strong>06</strong>
          <small><MapPin size={14} /> Across 3 buildings</small>
        </article>
      </section>

      <section className="client-dashboard-grid">
        <article className="panel pending-panel">
          <div className="panel-heading">
            <div>
              <h2>Ready for your review</h2>
              <p>Completed work awaiting acknowledgement</p>
            </div>
            <span className="attention-count">3</span>
          </div>
          {[reports[0], { ...reports[3], id: "SR-2026-0079", status: "Awaiting signature" as ReportStatus }].map(
            (report) => (
              <div className="pending-report" key={report.id}>
                <div className="pending-date">
                  <strong>{report.date.split(" ")[0]}</strong>
                  <span>{report.date.split(" ")[1]}</span>
                </div>
                <div className="pending-info">
                  <span>{report.id}</span>
                  <strong>{report.equipment}</strong>
                  <small><MapPin size={13} /> {report.site}</small>
                </div>
                <div className="pending-actions">
                  <button type="button" onClick={() => onOpenReport(report)}>
                    Review
                  </button>
                  <button className="primary-button" type="button" onClick={() => onSign(report)}>
                    <PenLine size={16} /> Review & sign
                  </button>
                </div>
              </div>
            ),
          )}
        </article>

        <article className="panel service-health">
          <div className="panel-heading">
            <div>
              <h2>Equipment service health</h2>
              <p>Current condition from recent reports</p>
            </div>
          </div>
          <div className="health-donut">
            <div className="donut"><span>92<small>%</small></span></div>
            <p><strong>Healthy</strong><span>34 of 37 units running normally</span></p>
          </div>
          <div className="health-list">
            <span><i className="healthy" /> Running normally <strong>34</strong></span>
            <span><i className="followup" /> Follow-up required <strong>2</strong></span>
            <span><i className="repair" /> Repair required <strong>1</strong></span>
          </div>
        </article>
      </section>

      <article className="panel reports-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent service history</h2>
            <p>Your latest completed service records</p>
          </div>
          <button className="secondary-button" type="button">View history</button>
        </div>
        <ReportTable
          data={reports.filter((report) => report.client === "Changi General Hospital")}
          onOpenReport={onOpenReport}
        />
      </article>
    </>
  );
}

function CreateReport({ onDone }: { onDone: (message: string) => void }) {
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState<Record<string, string>>(
    Object.fromEntries(checklistItems.map((item) => [item, "Completed"])),
  );

  const steps = [
    ["Report details", "Client and service information"],
    ["Equipment", "Asset and location"],
    ["Service entry", "Checklist and readings"],
    ["Review", "Confirm and send"],
  ];

  return (
    <>
      <div className="page-heading create-heading">
        <div>
          <button className="back-link" type="button">
            <ArrowLeft size={16} /> Service reports
          </button>
          <h1>Create service report</h1>
          <p>Report number <strong>SR-2026-0085</strong> has been reserved.</p>
        </div>
        <div className="draft-state"><span /> Draft saved just now</div>
      </div>

      <div className="create-layout">
        <aside className="stepper" aria-label="Report creation steps">
          {steps.map(([title, description], index) => {
            const number = index + 1;
            return (
              <button
                key={title}
                type="button"
                className={`${step === number ? "active" : ""} ${step > number ? "complete" : ""}`}
                onClick={() => setStep(number)}
              >
                <span>{step > number ? <Check size={16} /> : number}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </button>
            );
          })}
          <div className="stepper-help">
            <ShieldCheck size={19} />
            <p><strong>Safe to pause</strong>Your progress is saved as you work.</p>
          </div>
        </aside>

        <section className="panel form-panel">
          {step === 1 && <ReportDetailsStep />}
          {step === 2 && <EquipmentStep />}
          {step === 3 && <ServiceEntryStep checks={checks} setChecks={setChecks} />}
          {step === 4 && <ReviewStep checks={checks} />}

          <div className="form-footer">
            <button
              className="secondary-button"
              type="button"
              onClick={() => step > 1 ? setStep(step - 1) : onDone("Draft SR-2026-0085 saved.")}
            >
              {step > 1 ? <><ArrowLeft size={16} /> Back</> : "Save draft"}
            </button>
            {step < 4 ? (
              <button className="primary-button" type="button" onClick={() => setStep(step + 1)}>
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={() => onDone("SR-2026-0085 sent to Changi General Hospital.")}
              >
                <Send size={16} /> Send to client
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="form-section-heading">
      <span><Icon size={20} /></span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </div>
  );
}

function ReportDetailsStep() {
  return (
    <div className="form-step">
      <SectionHeading
        icon={Building2}
        title="Report details"
        description="Select the client and define the service visit."
      />
      <div className="form-grid">
        <label className="field span-2">
          <span>Client <b>*</b></span>
          <select defaultValue="Changi General Hospital">
            <option>Changi General Hospital</option>
            <option>Tuas Power Generation</option>
            <option>Northpoint City</option>
          </select>
        </label>
        <label className="field">
          <span>Report date <b>*</b></span>
          <input type="date" defaultValue="2026-07-23" />
        </label>
        <label className="field">
          <span>Service month <b>*</b></span>
          <select defaultValue="July 2026">
            <option>July 2026</option>
            <option>June 2026</option>
          </select>
        </label>
        <label className="field span-2">
          <span>Service location <b>*</b></span>
          <select defaultValue="Level 2 · AHU Room">
            <option>Level 2 · AHU Room</option>
            <option>Level 1 · Pharmacy Entrance</option>
            <option>Level 1 · Pharmacy Exit</option>
          </select>
        </label>
      </div>
      <fieldset className="service-type">
        <legend>Service type <b>*</b></legend>
        <div>
          {["Regular Service", "Warranty Service", "Complaint", "Other"].map((type) => (
            <label key={type}>
              <input type="radio" name="service-type" defaultChecked={type === "Regular Service"} />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="info-strip">
        <Building2 size={18} />
        <span><strong>Changi General Hospital</strong> · 2 Simei Street 3, Singapore 529889</span>
      </div>
    </div>
  );
}

function EquipmentStep() {
  return (
    <div className="form-step">
      <SectionHeading
        icon={Gauge}
        title="Equipment selection"
        description="The linked checklist will load automatically."
      />
      <div className="equipment-picker">
        <button className="active" type="button">
          <span className="equipment-icon"><Gauge size={21} /></span>
          <span><strong>AHU-02</strong><small>Daikin · Model D-AHU-450</small></span>
          <CheckCircle2 size={18} />
        </button>
        <button type="button">
          <span className="equipment-icon"><Gauge size={21} /></span>
          <span><strong>AHU-03</strong><small>Carrier · Model 39HQ-08</small></span>
        </button>
        <button className="add-equipment" type="button">
          <Plus size={19} /> Select another equipment
        </button>
      </div>
      <div className="form-grid equipment-fields">
        <label className="field">
          <span>Equipment type</span>
          <input value="Air Handling Unit (AHU)" readOnly />
        </label>
        <label className="field">
          <span>Serial number</span>
          <input value="DK-AHU-22084" readOnly />
        </label>
        <label className="field span-2">
          <span>Exact location</span>
          <input value="Block A · Level 2 · AHU Room" readOnly />
        </label>
      </div>
      <div className="checklist-loaded">
        <ClipboardCheck size={21} />
        <div><strong>AHU Preventive Maintenance</strong><span>8 checklist items · 6 measurement fields</span></div>
        <span className="status-badge status-completed">Loaded</span>
      </div>
    </div>
  );
}

function ServiceEntryStep({
  checks,
  setChecks,
}: {
  checks: Record<string, string>;
  setChecks: (value: Record<string, string>) => void;
}) {
  return (
    <div className="form-step">
      <SectionHeading
        icon={ClipboardCheck}
        title="Service entry"
        description="Complete the equipment checklist and record readings."
      />
      <div className="checklist-table">
        <div className="checklist-header">
          <span>Checklist item</span><span>Result</span><span>Remarks</span>
        </div>
        {checklistItems.map((item, index) => (
          <div className="checklist-row" key={item}>
            <span className="checklist-name"><i>{index + 1}</i>{item}</span>
            <span className="result-toggle">
              {["Completed", "No", "N/A"].map((result) => (
                <button
                  className={checks[item] === result ? "active" : ""}
                  type="button"
                  key={result}
                  onClick={() => setChecks({ ...checks, [item]: result })}
                >
                  {result === "Completed" ? <Check size={14} /> : result}
                </button>
              ))}
            </span>
            <input aria-label={`Remarks for ${item}`} placeholder="Add remark" />
          </div>
        ))}
      </div>
      <div className="subsection-title">
        <div><h3>Measurements</h3><p>Record the readings captured after service.</p></div>
        <button className="text-button" type="button"><Plus size={15} /> Add reading</button>
      </div>
      <div className="measurement-grid">
        {[
          ["R-phase current", "4.2", "A"],
          ["Y-phase current", "4.0", "A"],
          ["B-phase current", "4.1", "A"],
          ["R-phase megger", "2.8", "MΩ"],
          ["Y-phase megger", "2.7", "MΩ"],
          ["B-phase megger", "2.9", "MΩ"],
        ].map(([label, value, unit]) => (
          <label className="field" key={label}>
            <span>{label}</span>
            <span className="unit-input"><input defaultValue={value} /><i>{unit}</i></span>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Work performed</span>
        <textarea defaultValue="Completed preventive maintenance. Cleaned filters, cooling coil, fan motor and blower. Checked actuator operation and motor bearings." />
      </label>
      <div className="attachment-drop">
        <Paperclip size={20} />
        <span><strong>Add service photos or documents</strong><small>PNG, JPG or PDF · Up to 10 MB each</small></span>
        <button className="secondary-button" type="button">Choose files</button>
      </div>
    </div>
  );
}

function ReviewStep({ checks }: { checks: Record<string, string> }) {
  const completed = Object.values(checks).filter((value) => value === "Completed").length;
  return (
    <div className="form-step review-step">
      <SectionHeading
        icon={FileCheck2}
        title="Review and send"
        description="Confirm the details before sending the report to the client."
      />
      <div className="review-banner">
        <CheckCircle2 size={22} />
        <div><strong>Ready to send</strong><span>All required fields are complete.</span></div>
      </div>
      <div className="review-card">
        <div className="review-card-header">
          <div><span>Service report</span><strong>SR-2026-0085</strong></div>
          <StatusBadge status="Draft" />
        </div>
        <div className="review-summary">
          <span><small>Client</small><strong>Changi General Hospital</strong></span>
          <span><small>Service date</small><strong>23 July 2026</strong></span>
          <span><small>Location</small><strong>Level 2 · AHU Room</strong></span>
          <span><small>Equipment</small><strong>AHU-02 · Daikin</strong></span>
        </div>
      </div>
      <div className="review-sections">
        <button type="button"><span><ClipboardCheck size={18} /><span><strong>Checklist</strong><small>{completed} of {checklistItems.length} items completed</small></span></span><PenLine size={16} /></button>
        <button type="button"><span><Gauge size={18} /><span><strong>Measurements</strong><small>6 readings recorded</small></span></span><PenLine size={16} /></button>
        <button type="button"><span><HardHat size={18} /><span><strong>Technicians</strong><small>Nasir Majid · Daniel Tan</small></span></span><PenLine size={16} /></button>
        <button type="button"><span><Paperclip size={18} /><span><strong>Attachments</strong><small>3 service photos</small></span></span><PenLine size={16} /></button>
      </div>
      <div className="send-note">
        <Send size={18} />
        <p><strong>What happens next?</strong>The client receives a notification and can review this report in their secure portal. The record is locked after signature.</p>
      </div>
    </div>
  );
}

function MasterData({ onNotify }: { onNotify: (message: string) => void }) {
  const [master, setMaster] = useState("Clients");
  const masterTabs = ["Clients", "Locations", "Equipment", "Checklists"];
  const rows = {
    Clients: [
      ["Changi General Hospital", "3 locations", "24 equipment", "Active"],
      ["Tuas Power Generation", "2 locations", "16 equipment", "Active"],
      ["Northpoint City", "4 locations", "31 equipment", "Active"],
      ["Sentosa Cove Resort", "2 locations", "19 equipment", "Active"],
    ],
    Locations: [
      ["Level 2 · AHU Room", "Changi General Hospital", "8 equipment", "Active"],
      ["Pharmacy Entrance · L1", "Changi General Hospital", "3 equipment", "Active"],
      ["Turbine Building · L1", "Tuas Power Generation", "6 equipment", "Active"],
      ["Loading Bay · B2", "Northpoint City", "4 equipment", "Active"],
    ],
    Equipment: [
      ["AHU-02 · Daikin", "Changi General Hospital", "AHU", "Active"],
      ["Air Curtain AC-04", "Tuas Power Generation", "Air Curtain", "Active"],
      ["Pre-Cool Unit PCU-03", "Northpoint City", "Pre-Cool Unit", "Active"],
      ["AHU-11 · Carrier", "Sentosa Cove Resort", "AHU", "Active"],
    ],
    Checklists: [
      ["AHU Preventive Maintenance", "AHU", "8 items", "Active"],
      ["Air Curtain Routine Service", "Air Curtain", "6 items", "Active"],
      ["Pre-Cool Unit Checklist", "Pre-Cool Unit", "7 items", "Active"],
      ["Outdoor Unit Service", "Outdoor Unit", "5 items", "Active"],
    ],
  }[master] as string[][];

  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">Administration</span><h1>Master data</h1><p>Keep client, location, equipment, and checklist records accurate.</p></div>
        <button className="primary-button" type="button" onClick={() => onNotify(`New ${master.slice(0, -1).toLowerCase()} form opened.`)}><Plus size={17} /> Add {master.slice(0, -1)}</button>
      </div>
      <section className="master-stat-grid">
        <article><span className="metric-icon green"><Building2 size={20} /></span><p><strong>18</strong><span>Active clients</span></p></article>
        <article><span className="metric-icon blue"><MapPin size={20} /></span><p><strong>42</strong><span>Service locations</span></p></article>
        <article><span className="metric-icon amber"><Gauge size={20} /></span><p><strong>126</strong><span>Equipment records</span></p></article>
        <article><span className="metric-icon purple"><ClipboardCheck size={20} /></span><p><strong>12</strong><span>Checklist templates</span></p></article>
      </section>
      <article className="panel master-panel">
        <div className="master-tabs">
          {masterTabs.map((tab) => <button className={tab === master ? "active" : ""} type="button" key={tab} onClick={() => setMaster(tab)}>{tab}</button>)}
        </div>
        <div className="report-toolbar">
          <label className="table-search"><Search size={17} /><input placeholder={`Search ${master.toLowerCase()}…`} /></label>
          <button className="secondary-button" type="button"><SlidersHorizontal size={16} /> Filter</button>
        </div>
        <div className="simple-list">
          {rows.map((row) => (
            <button type="button" key={row[0]}>
              <span className="list-avatar">{row[0].split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
              <span><strong>{row[0]}</strong><small>{row[1]}</small></span>
              <span className="list-secondary">{row[2]}</span>
              <span className="status-badge status-completed">{row[3]}</span>
              <MoreHorizontal size={18} />
            </button>
          ))}
        </div>
      </article>
    </>
  );
}

function TechniciansPage({ onNotify }: { onNotify: (message: string) => void }) {
  const technicians = [
    ["Nasir Majid", "EMP-014", "Senior Technician", "32 reports", "NM"],
    ["Daniel Tan", "EMP-021", "Service Technician", "28 reports", "DT"],
    ["Arun Kumar", "EMP-026", "Service Technician", "21 reports", "AK"],
    ["Faizal Rahman", "EMP-031", "Junior Technician", "14 reports", "FR"],
  ];
  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">Service team</span><h1>Technicians</h1><p>Manage team details and approved signatures.</p></div>
        <button className="primary-button" type="button" onClick={() => onNotify("New technician form opened.")}><Plus size={17} /> Add technician</button>
      </div>
      <div className="technician-grid">
        {technicians.map((tech, index) => (
          <article className="panel technician-card" key={tech[1]}>
            <div className={`tech-avatar tech-${index}`}>{tech[4]}</div>
            <div><h2>{tech[0]}</h2><p>{tech[2]}</p></div>
            <span className="status-badge status-completed">Active</span>
            <dl><div><dt>Employee ID</dt><dd>{tech[1]}</dd></div><div><dt>This month</dt><dd>{tech[3]}</dd></div></dl>
            <div className="signature-sample">{tech[0].split(" ")[0]}</div>
            <button className="secondary-button" type="button"><Eye size={16} /> View profile</button>
          </article>
        ))}
      </div>
    </>
  );
}

function SettingsPage({ role, onNotify }: { role: Role; onNotify: (message: string) => void }) {
  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">{role === "admin" ? "Administration" : "Account"}</span><h1>{role === "admin" ? "Company settings" : "My profile"}</h1><p>Manage your organization details, preferences, and security.</p></div>
        <button className="primary-button" type="button" onClick={() => onNotify("Settings saved successfully.")}><Check size={17} /> Save changes</button>
      </div>
      <div className="settings-layout">
        <nav className="panel settings-nav">
          {["Company profile", "Report branding", "Notifications", "Users & roles", "Security"].map((item, index) => <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}<ChevronRight size={16} /></button>)}
        </nav>
        <section className="panel settings-panel">
          <SectionHeading icon={Building2} title={role === "admin" ? "Company profile" : "Profile details"} description="These details appear on service reports and notifications." />
          <div className="company-logo-box"><span className="brand-mark">P</span><div><strong>Organization logo</strong><small>PNG or JPG · Recommended 512 × 512 px</small></div><button className="secondary-button" type="button">Change logo</button></div>
          <div className="form-grid">
            <label className="field span-2"><span>Company name</span><input defaultValue={role === "admin" ? "Promach Engineering Pte. Ltd." : "Changi General Hospital"} /></label>
            <label className="field"><span>Contact email</span><input defaultValue={role === "admin" ? "service@promach.com" : "facilities@cgh.com"} /></label>
            <label className="field"><span>Phone number</span><input defaultValue="+65 6123 4567" /></label>
            <label className="field span-2"><span>Registered address</span><textarea defaultValue="18 Boon Lay Way, TradeHub 21, Singapore 609966" /></label>
          </div>
        </section>
      </div>
    </>
  );
}

function ReportDrawer({
  report,
  role,
  onClose,
  onSign,
}: {
  report: Report;
  role: Role;
  onClose: () => void;
  onSign: () => void;
}) {
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={`Report ${report.id}`}>
      <button className="drawer-scrim" aria-label="Close report" type="button" onClick={onClose} />
      <aside className="report-drawer">
        <div className="drawer-header">
          <div><span>Service report</span><h2>{report.id}</h2></div>
          <button className="icon-button" aria-label="Close" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="drawer-actions">
          <StatusBadge status={report.status} />
          <span />
          <button type="button"><Printer size={17} /> Print</button>
          <button type="button"><Download size={17} /> PDF</button>
        </div>
        <div className="drawer-content">
          <section className="report-hero">
            <span className="report-file-icon"><FileCheck2 size={23} /></span>
            <div><span>{report.type}</span><strong>{report.client}</strong><small><MapPin size={13} /> {report.site}</small></div>
          </section>
          <section className="report-info-grid">
            <span><small>Service date</small><strong>{report.date}</strong></span>
            <span><small>Equipment</small><strong>{report.equipment}</strong></span>
            <span><small>Condition</small><strong className="condition-good"><CheckCircle2 size={14} /> Running normally</strong></span>
            <span><small>Technician</small><strong>{report.technician}</strong></span>
          </section>
          <section className="drawer-section">
            <h3>Work performed</h3>
            <p>Completed preventive maintenance. Cleaned air filters, cooling coil, fan motor and blower. Checked actuator operation and lubricated motor bearings.</p>
          </section>
          <section className="drawer-section">
            <div className="drawer-section-heading"><h3>Equipment checklist</h3><span>{checklistItems.length}/{checklistItems.length} complete</span></div>
            <div className="drawer-checklist">
              {checklistItems.map((item) => <span key={item}><Check size={14} /> {item}</span>)}
            </div>
          </section>
          <section className="drawer-section">
            <h3>Measurements</h3>
            <div className="drawer-measurements">
              <span><small>R phase</small><strong>4.2 A</strong></span>
              <span><small>Y phase</small><strong>4.0 A</strong></span>
              <span><small>B phase</small><strong>4.1 A</strong></span>
              <span><small>Temperature</small><strong>22.4 °C</strong></span>
            </div>
          </section>
          <section className="audit-note">
            <ShieldCheck size={18} />
            <p><strong>Audit trail active</strong><span>Last updated by {report.technician} on {report.date}, 3:12 PM.</span></p>
          </section>
        </div>
        <div className="drawer-footer">
          {report.status === "Awaiting signature" ? (
            <button className="primary-button" type="button" onClick={onSign}>
              <PenLine size={17} /> {role === "admin" ? "Collect client signature" : "Review & sign report"}
            </button>
          ) : (
            <button className="primary-button" type="button"><Download size={17} /> Download completed PDF</button>
          )}
        </div>
      </aside>
    </div>
  );
}

function SignatureModal({
  report,
  onClose,
  onSubmit,
}: {
  report: Report;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const context = canvas.getContext("2d");
    context?.scale(ratio, ratio);
    if (context) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.25;
      context.strokeStyle = "#14382f";
    }
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = event.currentTarget.getContext("2d");
    const { x, y } = point(event);
    context?.beginPath();
    context?.moveTo(x, y);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const { x, y } = point(event);
    context?.lineTo(x, y);
    context?.stroke();
    setHasSignature(true);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="signature-title">
      <button className="modal-scrim" aria-label="Close signature dialog" type="button" onClick={onClose} />
      <section className="signature-modal">
        <div className="modal-header">
          <div><span className="eyebrow">Final acknowledgement</span><h2 id="signature-title">Review and sign report</h2><p>{report.id} · {report.equipment}</p></div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="signature-body">
          <div className="signature-summary">
            <CheckCircle2 size={19} />
            <p><strong>Service work reviewed</strong><span>All {checklistItems.length} checklist items were completed. Equipment condition: Running normally.</span></p>
          </div>
          <div className="form-grid">
            <label className="field"><span>Representative name <b>*</b></span><input defaultValue="Nasir Bin Abdul Majid" /></label>
            <label className="field"><span>Designation <b>*</b></span><input defaultValue="Facilities Manager" /></label>
          </div>
          <fieldset className="satisfaction-options">
            <legend>Satisfaction status <b>*</b></legend>
            <label><input type="radio" name="satisfaction" defaultChecked /><span><CheckCircle2 size={17} /><strong>Work completed satisfactorily</strong></span></label>
            <label><input type="radio" name="satisfaction" /><span><CircleAlert size={17} /><strong>Completed with observations</strong></span></label>
            <label><input type="radio" name="satisfaction" /><span><X size={17} /><strong>Not satisfied</strong></span></label>
          </fieldset>
          <label className="field"><span>Comments <i>Optional</i></span><textarea placeholder="Add any observations or comments…" /></label>
          <div className="signature-field">
            <div className="signature-label"><span>Digital signature <b>*</b></span><button type="button" onClick={clear}>Clear</button></div>
            <div className={`canvas-wrap ${hasSignature ? "signed" : ""}`}>
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={() => { drawing.current = false; }}
                onPointerCancel={() => { drawing.current = false; }}
              />
              {!hasSignature && <span><PenLine size={20} /> Sign here using your finger, mouse, or stylus</span>}
              <i />
            </div>
          </div>
          <label className="consent-row">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>I confirm that I have reviewed this service report and the information above is accurate.</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="button" disabled={!hasSignature || !accepted} onClick={onSubmit}>
            <LockKeyhole size={16} /> Sign and submit report
          </button>
        </div>
      </section>
    </div>
  );
}
