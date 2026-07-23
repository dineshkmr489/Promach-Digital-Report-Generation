"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FileImage,
  FileSearch,
  FileText,
  Gauge,
  HardHat,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  allEquipment,
  company,
  serviceReports,
  sourceDocuments,
  type ServiceReport,
} from "./reportData";
import { downloadServiceReportPdf } from "./reportPdf";

type View = "overview" | "reports" | "equipment" | "sources";

const navItems = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "reports" as const, label: "Service reports", icon: FileText },
  { id: "equipment" as const, label: "Equipment records", icon: Gauge },
  { id: "sources" as const, label: "Source documents", icon: FileSearch },
];

export function DigitalServiceApp() {
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ServiceReport | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");

  const filteredReports = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return serviceReports;
    return serviceReports.filter((report) =>
      [
        report.id,
        report.client,
        report.address,
        report.summary,
        ...report.equipment.map((equipment) => equipment.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  function generatePdf(report: ServiceReport) {
    downloadServiceReportPdf(report);
    setPdfMessage(`Report ${report.id} PDF generated.`);
    window.setTimeout(() => setPdfMessage(""), 3200);
  }

  return (
    <div className="real-app-shell">
      <aside className={`real-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="real-brand">
          <span className="real-brand-mark">P</span>
          <div>
            <strong>PROMACH</strong>
            <small>Digital service reports</small>
          </div>
        </div>

        <div className="source-status">
          <span className="source-status-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            <strong>Source-only dataset</strong>
            <small>2 supplied records · July 2026</small>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <span className="nav-overline">Workspace</span>
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
                <span>{item.label}</span>
                {item.id === "reports" && <i>2</i>}
              </button>
            );
          })}
        </nav>

        <div className="real-sidebar-note">
          <Sparkles size={18} />
          <strong>Data cleaned</strong>
          <p>
            Previous demonstration clients, reports, people, and measurements
            have been removed.
          </p>
        </div>

        <div className="company-mini">
          <strong>{company.name}</strong>
          <span>{company.registration}</span>
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
                aria-label="Search supplied records"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the 2 supplied reports…"
                value={query}
              />
            </label>
          </div>
          <div className="dataset-pill">
            <span />
            Verified source workspace
          </div>
        </header>

        <div className="real-page">
          {view === "overview" && (
            <Overview
              reports={filteredReports}
              onOpen={setSelectedReport}
              onGenerate={generatePdf}
              onViewAll={() => navigate("reports")}
            />
          )}
          {view === "reports" && (
            <Reports
              reports={filteredReports}
              onOpen={setSelectedReport}
              onGenerate={generatePdf}
            />
          )}
          {view === "equipment" && <EquipmentRecords />}
          {view === "sources" && <SourceDocuments />}
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
              <span>{item.label.replace("Service ", "").replace(" records", "")}</span>
            </button>
          );
        })}
      </nav>

      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onGenerate={generatePdf}
        />
      )}

      {pdfMessage && (
        <div className="real-toast" role="status">
          <CheckCircle2 size={19} />
          {pdfMessage}
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

function Overview({
  reports,
  onOpen,
  onGenerate,
  onViewAll,
}: {
  reports: ServiceReport[];
  onOpen: (report: ServiceReport) => void;
  onGenerate: (report: ServiceReport) => void;
  onViewAll: () => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Source review completed · 23 July 2026"
        title="Verified July service records"
        description="Only the data found in your supplied 9-page PDF and service-report image is shown here."
        action={
          <button
            className="real-primary-button"
            onClick={() => onGenerate(serviceReports[0])}
            type="button"
          >
            <Download size={17} />
            Generate report 4122 PDF
          </button>
        }
      />

      <section className="real-metrics" aria-label="Supplied record totals">
        <Metric icon={FileCheck2} label="Completed reports" value="02" note="Both source records" tone="green" />
        <Metric icon={Building2} label="Customers" value="02" note="CGH and Tuas Power" tone="blue" />
        <Metric icon={Gauge} label="Equipment serviced" value="07" note="6 CGH · 1 Tuas Power" tone="violet" />
        <Metric icon={AlertTriangle} label="Follow-up required" value="01" note="Pre-cool chemical wash" tone="amber" />
      </section>

      <section className="verified-banner">
        <div className="verified-badge">
          <ShieldCheck size={24} />
        </div>
        <div>
          <span>Source-backed workspace</span>
          <h2>All previous demonstration data has been removed.</h2>
          <p>
            This workspace now contains 2 reports, 2 customers, 7 equipment
            entries, 4 locations, and the measurements transcribed from the
            supplied files.
          </p>
        </div>
        <div className="verified-stats">
          <span><strong>9</strong> scanned PDF pages</span>
          <span><strong>1</strong> service report image</span>
          <span><strong>8</strong> review notes</span>
        </div>
      </section>

      <section className="real-dashboard-grid">
        <article className="real-panel">
          <div className="real-panel-heading">
            <div>
              <span>Real records</span>
              <h2>Service reports</h2>
              <p>Completed and acknowledged July 2026 reports.</p>
            </div>
            <button className="real-text-button" onClick={onViewAll} type="button">
              View all <ArrowRight size={15} />
            </button>
          </div>
          <div className="real-report-list">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onOpen={() => onOpen(report)}
                onGenerate={() => onGenerate(report)}
              />
            ))}
          </div>
        </article>

        <article className="real-panel follow-up-panel">
          <div className="real-panel-heading">
            <div>
              <span>Needs action</span>
              <h2>Recorded follow-up</h2>
            </div>
            <span className="follow-count">1</span>
          </div>
          <div className="follow-card">
            <span className="follow-icon"><AlertTriangle size={20} /></span>
            <div>
              <strong>Pre-cool coil chemical wash</strong>
              <p>
                Report 4122 records the Level 2 pre-cool unit coil as dirty or
                choked and requiring a chemical wash.
              </p>
              <button onClick={() => onOpen(serviceReports[0])} type="button">
                Open report 4122 <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="data-quality">
            <FileSearch size={19} />
            <div>
              <strong>Transcription review</strong>
              <p>
                A repeated serial number and partially unclear handwriting are
                flagged inside the report instead of being silently corrected.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="real-panel equipment-summary">
        <div className="real-panel-heading">
          <div>
            <span>Equipment coverage</span>
            <h2>What the supplied records contain</h2>
          </div>
        </div>
        <div className="equipment-summary-grid">
          <SummaryType label="Air curtain" count="4" detail="KDK · Model 3015UA" />
          <SummaryType label="AHU" count="2" detail="CGH Level 2 + Tuas DX AHU-15" />
          <SummaryType label="Pre-cool unit" count="1" detail="CGH Level 2 AHU room" />
          <SummaryType label="Electrical readings" count="8" detail="6 AHU phase readings + 2 averages" />
        </div>
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
  icon: typeof FileCheck2;
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

function SummaryType({
  label,
  count,
  detail,
}: {
  label: string;
  count: string;
  detail: string;
}) {
  return (
    <article>
      <span>{count}</span>
      <div><strong>{label}</strong><small>{detail}</small></div>
    </article>
  );
}

function ReportRow({
  report,
  onOpen,
  onGenerate,
}: {
  report: ServiceReport;
  onOpen: () => void;
  onGenerate: () => void;
}) {
  return (
    <article className="real-report-row">
      <button className="report-row-main" onClick={onOpen} type="button">
        <span className="report-number"><small>Report</small><strong>#{report.id}</strong></span>
        <span className="report-client">
          <strong>{report.client}</strong>
          <small><MapPin size={13} /> {report.address}</small>
        </span>
        <span className="report-date"><small>Service date</small><strong>{report.date}</strong></span>
        <span className="report-assets"><small>Equipment</small><strong>{report.equipment.length} serviced</strong></span>
        <span className={`real-status ${report.condition === "Follow-up required" ? "follow" : ""}`}>
          {report.condition === "Follow-up required" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
          {report.condition}
        </span>
        <ChevronRight size={18} />
      </button>
      <button
        className="row-pdf-button"
        onClick={onGenerate}
        type="button"
        aria-label={`Generate PDF for report ${report.id}`}
      >
        <Download size={16} /> PDF
      </button>
    </article>
  );
}

function Reports({
  reports,
  onOpen,
  onGenerate,
}: {
  reports: ServiceReport[];
  onOpen: (report: ServiceReport) => void;
  onGenerate: (report: ServiceReport) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="2 source-backed records"
        title="Service reports"
        description="No demonstration reports remain. Select either record to review its complete transcription and generate a PDF."
      />
      <section className="real-panel reports-page">
        <div className="report-page-toolbar">
          <div>
            <span className="active">All supplied reports <i>2</i></span>
            <span>Completed <i>2</i></span>
          </div>
          <span className="source-only-label"><ShieldCheck size={15} /> Source-only</span>
        </div>
        <div className="real-report-list large">
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onOpen={() => onOpen(report)}
              onGenerate={() => onGenerate(report)}
            />
          ))}
          {!reports.length && (
            <div className="real-empty">
              <Search size={24} />
              <strong>No matching supplied record</strong>
              <span>Try searching by report number, client, or equipment.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function EquipmentRecords() {
  const [client, setClient] = useState("All customers");
  const visibleEquipment =
    client === "All customers"
      ? allEquipment
      : allEquipment.filter((equipment) => equipment.client === client);

  return (
    <>
      <PageHeading
        eyebrow="7 transcribed equipment records"
        title="Equipment serviced"
        description="Equipment details below come only from the supplied PDF and image."
        action={
          <label className="real-select">
            <select value={client} onChange={(event) => setClient(event.target.value)}>
              <option>All customers</option>
              <option>Changi General Hospital</option>
              <option>Tuas Power Generation Pte. Ltd.</option>
            </select>
            <ChevronDown size={15} />
          </label>
        }
      />
      <div className="real-equipment-grid">
        {visibleEquipment.map((equipment) => (
          <article className="real-panel equipment-card" key={equipment.id}>
            <div className="equipment-card-top">
              <span className="equipment-type-icon">
                {equipment.type === "Air Curtain" ? <Gauge size={21} /> : <ClipboardCheck size={21} />}
              </span>
              <span className="real-status"><CheckCircle2 size={13} /> Completed</span>
            </div>
            <span className="equipment-client">{equipment.client}</span>
            <h2>{equipment.name}</h2>
            <p>{equipment.type}</p>
            <dl>
              <div><dt>Brand</dt><dd>{equipment.brand}</dd></div>
              <div><dt>Model</dt><dd>{equipment.model}</dd></div>
              <div><dt>Serial</dt><dd>{equipment.serial}</dd></div>
              <div><dt>Location</dt><dd>{equipment.location}</dd></div>
            </dl>
            <div className="equipment-result">
              <CheckCircle2 size={16} />
              <span><strong>{equipment.checklist.length}/{equipment.checklist.length} checklist items</strong><small>{equipment.note}</small></span>
            </div>
            {equipment.reviewRequired && (
              <div className="review-chip"><AlertTriangle size={13} /> Source confirmation needed</div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function SourceDocuments() {
  return (
    <>
      <PageHeading
        eyebrow="Original supplied evidence"
        title="Source documents"
        description="Open the original files used for this transcription and compare them with the structured records."
      />
      <div className="source-grid">
        {sourceDocuments.map((document) => (
          <article className="real-panel source-card" key={document.reportId}>
            <a href={document.href} target="_blank" rel="noreferrer">
              <Image
                src={document.thumbnail}
                alt={`${document.client} original service report`}
                fill
                sizes="(max-width: 700px) 115px, 210px"
                unoptimized
              />
              <span className="source-open"><Eye size={16} /> Open original</span>
            </a>
            <div className="source-card-body">
              <span className="source-file-type">
                {document.pages.includes("Pages") ? <FileText size={15} /> : <FileImage size={15} />}
                {document.pages}
              </span>
              <h2>{document.client}</h2>
              <p>Service Report / Delivery Order #{document.reportId}</p>
              <div>
                <span><ShieldCheck size={15} /> Original preserved</span>
                <span><FileSearch size={15} /> {document.noteCount} review notes</span>
              </div>
              <a className="real-secondary-button" href={document.href} target="_blank" rel="noreferrer">
                View source document <ArrowRight size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>

      <section className="real-panel analysis-panel">
        <div className="real-panel-heading">
          <div>
            <span>Complete extraction notes</span>
            <h2>What requires human confirmation</h2>
            <p>These are source-quality issues, not additional application data.</p>
          </div>
        </div>
        <div className="analysis-list">
          {serviceReports.flatMap((report) =>
            report.transcriptionNotes.map((note, index) => (
              <article key={`${report.id}-${index}`}>
                <span>#{report.id}</span>
                <AlertTriangle size={17} />
                <p>{note}</p>
              </article>
            )),
          )}
        </div>
      </section>
    </>
  );
}

function ReportDetail({
  report,
  onClose,
  onGenerate,
}: {
  report: ServiceReport;
  onClose: () => void;
  onGenerate: (report: ServiceReport) => void;
}) {
  const [equipmentIndex, setEquipmentIndex] = useState(0);
  const equipment = report.equipment[equipmentIndex];

  return (
    <div className="detail-layer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button className="detail-scrim" aria-label="Close report" onClick={onClose} type="button" />
      <section className="report-detail">
        <header className="detail-header">
          <div>
            <button onClick={onClose} type="button"><ArrowLeft size={16} /> Back to reports</button>
            <span>Service Report / Delivery Order</span>
            <h2 id="detail-title">Report #{report.id}</h2>
          </div>
          <button className="detail-close" aria-label="Close" onClick={onClose} type="button"><X size={20} /></button>
        </header>

        <div className="detail-actionbar">
          <span className="real-status"><CheckCircle2 size={13} /> Completed</span>
          <span className={`real-status ${report.condition === "Follow-up required" ? "follow" : ""}`}>
            {report.condition === "Follow-up required" ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {report.condition}
          </span>
          <span />
          <a href={report.sourceDocument.href} target="_blank" rel="noreferrer"><Eye size={16} /> Original source</a>
          <button className="real-primary-button" onClick={() => onGenerate(report)} type="button"><Download size={16} /> Generate PDF</button>
        </div>

        <div className="detail-scroll">
          <section className="report-identity">
            <div className="identity-mark">P</div>
            <div>
              <span>{company.name}</span>
              <strong>{report.client}</strong>
              <small><MapPin size={13} /> {report.address}</small>
            </div>
            <dl>
              <div><dt>Report date</dt><dd>{report.date}</dd></div>
              <div><dt>Service month</dt><dd>{report.serviceMonth}</dd></div>
              <div><dt>Service type</dt><dd>{report.serviceType}</dd></div>
            </dl>
          </section>

          <section className="detail-section">
            <span className="detail-section-number">01</span>
            <div>
              <h3>Service summary</h3>
              <p>{report.summary}</p>
              <ul>{report.workPerformed.map((item) => <li key={item}><Check size={14} /> {item}</li>)}</ul>
            </div>
          </section>

          <section className="detail-section equipment-detail-section">
            <span className="detail-section-number">02</span>
            <div>
              <h3>Equipment and checklist</h3>
              <div className="equipment-tabs">
                {report.equipment.map((item, index) => (
                  <button className={index === equipmentIndex ? "active" : ""} key={item.id} onClick={() => setEquipmentIndex(index)} type="button">
                    {item.name}
                  </button>
                ))}
              </div>
              <div className="selected-equipment">
                <div className="selected-equipment-head">
                  <div><span>{equipment.type}</span><h4>{equipment.name}</h4><p>{equipment.location}</p></div>
                  {equipment.reviewRequired && <span className="review-chip"><AlertTriangle size={13} /> Review source</span>}
                </div>
                <dl>
                  <div><dt>Brand</dt><dd>{equipment.brand}</dd></div>
                  <div><dt>Model</dt><dd>{equipment.model}</dd></div>
                  <div><dt>Serial</dt><dd>{equipment.serial}</dd></div>
                </dl>
                <div className="detail-checklist">
                  {equipment.checklist.map((item) => <span key={item}><Check size={14} /><p>{item}</p><strong>YES</strong></span>)}
                </div>
                {!!equipment.measurements.length && (
                  <div className="detail-measurements">
                    {equipment.measurements.map((measurement) => (
                      <span key={measurement.label}><small>{measurement.label}</small><strong>{measurement.value} {measurement.unit}</strong></span>
                    ))}
                  </div>
                )}
                <div className={`equipment-note ${equipment.note.toLowerCase().includes("chemical") ? "warning" : ""}`}>
                  {equipment.note.toLowerCase().includes("chemical") ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
                  {equipment.note}
                </div>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <span className="detail-section-number">03</span>
            <div>
              <h3>Completion and acknowledgement</h3>
              <div className="completion-grid">
                <article><HardHat size={18} /><span>Completed by</span><strong>{report.technicians.join(", ")}</strong></article>
                <article><ShieldCheck size={18} /><span>Acknowledged by</span><strong>{report.acknowledgement.name}</strong><small>{report.acknowledgement.designation} · {report.acknowledgement.signedDate}</small></article>
              </div>
            </div>
          </section>

          <section className="detail-section review-section">
            <span className="detail-section-number">04</span>
            <div>
              <h3>Source transcription review</h3>
              {report.transcriptionNotes.map((note) => <p key={note}><AlertTriangle size={15} /> {note}</p>)}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
