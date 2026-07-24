"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { downloadServiceReportPdf } from "./reportPdf";
import { SignaturePad } from "./SignaturePad";
import type {
  ClientReportResponse,
  WorkspaceReport,
} from "./workspaceTypes";

export function ClientSigningApp({ token }: { token: string }) {
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/client/reports/${encodeURIComponent(token)}`, {
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | ClientReportResponse
          | { error: string };
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error : "Unable to open report");
        }
        if (!cancelled && "report" in payload) {
          setReport(payload.report);
          setSignerName(payload.report.signature?.signerName ?? "");
          setSignerEmail(payload.report.signature?.signerEmail ?? "");
          setDesignation(payload.report.signature?.designation ?? "");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Unable to open report",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitSignature(event: React.FormEvent) {
    event.preventDefault();
    if (!report || !signatureDataUrl || !consent) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/client/reports/${encodeURIComponent(token)}/sign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signerName,
            signerEmail,
            designation,
            signatureDataUrl,
            consent,
          }),
        },
      );
      const payload = (await response.json()) as
        | { report: WorkspaceReport }
        | { error: string };
      if (!response.ok || !("report" in payload)) {
        throw new Error(
          "error" in payload ? payload.error : "Unable to sign report",
        );
      }
      setReport(payload.report);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign report",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="client-portal client-state">
        <LoaderCircle className="spin" size={34} />
        <h1>Opening your service report</h1>
        <p>Checking the secure report link…</p>
      </main>
    );
  }

  if (!report || error) {
    return (
      <main className="client-portal client-state error">
        <AlertCircle size={36} />
        <h1>This report link is unavailable</h1>
        <p>{error || "The link may be incorrect, expired, or replaced."}</p>
        <small>Ask Promach to send you a new secure signing link.</small>
      </main>
    );
  }

  const completed = report.status === "Completed";

  return (
    <main className="client-portal">
      <header className="client-header">
        <div className="client-brand">
          <span>P</span>
          <div>
            <strong>PROMACH</strong>
            <small>Digital service report</small>
          </div>
        </div>
        <span className="secure-link-pill">
          <LockKeyhole size={14} /> Secure report link
        </span>
      </header>

      <div className="client-container">
        {completed ? (
          <section className="client-complete-banner">
            <CheckCircle2 size={28} />
            <div>
              <span>Signature completed</span>
              <h1>Thank you, {report.signature?.signerName}</h1>
              <p>
                Report #{report.id} is now locked. A signed copy is ready to
                download.
              </p>
            </div>
            <button
              className="real-primary-button"
              onClick={() => downloadServiceReportPdf(report)}
              type="button"
            >
              <Download size={17} />
              Download signed PDF
            </button>
          </section>
        ) : (
          <section className="client-intro">
            <span>Customer review and acknowledgement</span>
            <h1>Service report #{report.id}</h1>
            <p>
              Please review the completed work below, then add your digital
              signature.
            </p>
          </section>
        )}

        <section className="client-report-card">
          <div className="client-report-identity">
            <div>
              <small>Customer</small>
              <strong>{report.client}</strong>
              <span>
                <MapPin size={14} /> {report.address}
              </span>
            </div>
            <dl>
              <div>
                <dt>Report</dt>
                <dd>#{report.id}</dd>
              </div>
              <div>
                <dt>Service date</dt>
                <dd>{report.date}</dd>
              </div>
              <div>
                <dt>Service type</dt>
                <dd>{report.serviceType}</dd>
              </div>
            </dl>
          </div>

          <div className="client-report-section">
            <span className="client-section-icon">
              <FileCheck2 size={19} />
            </span>
            <div>
              <h2>Service summary</h2>
              <p>{report.summary}</p>
              <ul>
                {report.workPerformed.map((item) => (
                  <li key={item}>
                    <Check size={14} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="client-report-section">
            <span className="client-section-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h2>Equipment and checklist</h2>
              <div className="client-equipment-list">
                {report.equipment.map((item) => (
                  <article key={item.id}>
                    <div>
                      <span>{item.type}</span>
                      <strong>{item.name}</strong>
                      <small>{item.location}</small>
                    </div>
                    <dl>
                      <div><dt>Brand</dt><dd>{item.brand}</dd></div>
                      <div><dt>Model</dt><dd>{item.model}</dd></div>
                      <div><dt>Serial</dt><dd>{item.serial}</dd></div>
                    </dl>
                    <p>
                      <CheckCircle2 size={15} />
                      {item.checklist.length} checklist items completed
                    </p>
                    <ul className="client-checklist">
                      {item.checklist.map((checkItem, index) => {
                        const result =
                          item.checklistResults?.[index]?.result ?? "YES";
                        return (
                          <li key={checkItem}>
                            <span>{checkItem}</span>
                            <strong className={result.toLowerCase().replace("/", "")}>
                              {result}
                            </strong>
                          </li>
                        );
                      })}
                    </ul>
                    {!!item.measurements.length && (
                      <div className="client-readings">
                        {item.measurements.map((measurement) => (
                          <span key={measurement.label}>
                            <small>{measurement.label}</small>
                            <strong>
                              {measurement.value || "Not recorded"} {measurement.unit}
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="client-remarks">
            <div><span>Remarks</span><p>{report.remarks}</p></div>
            <div><span>Follow-up</span><p>{report.followUp}</p></div>
            <div><span>Completed by</span><p>{report.technicians.join(", ")}</p></div>
          </div>
        </section>

        {!completed && (
          <form className="client-sign-form" onSubmit={submitSignature}>
            <div className="sign-form-heading">
              <span>Digital acknowledgement</span>
              <h2>Confirm the work and sign</h2>
              <p>
                Your name, signature, time, and signing channel will be attached
                to this exact report revision.
              </p>
            </div>
            <div className="form-grid two">
              <label>
                Full name
                <input
                  required
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <label>
                Designation
                <input
                  required
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value)}
                  placeholder="e.g. Facilities Manager"
                />
              </label>
              <label className="span-two">
                Email
                <input
                  required
                  type="email"
                  value={signerEmail}
                  onChange={(event) => setSignerEmail(event.target.value)}
                  placeholder="name@company.com"
                />
              </label>
            </div>
            <SignaturePad onChange={setSignatureDataUrl} />
            <label className="signature-consent">
              <input
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                I confirm that the service work described in report #{report.id}
                has been completed to our satisfaction and I agree to use this
                digital signature as my acknowledgement.
              </span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button
              className="real-primary-button sign-submit"
              disabled={
                submitting ||
                !signatureDataUrl ||
                !consent ||
                !signerName.trim() ||
                !signerEmail.trim() ||
                !designation.trim()
              }
              type="submit"
            >
              {submitting ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}
              {submitting ? "Submitting signature…" : "Sign and complete report"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
