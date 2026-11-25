import React, { useState, useEffect, useCallback } from 'react';
import { Download, Copy, Check, X, FileText, RefreshCw } from 'lucide-react';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  productGroups: Array<{ id?: string; name: string }>;
}

interface ReportDeliverable {
  id: string;
  track: string;
  task: string;
  from: string;
  assignee: string;
  taskLink?: string;
  completionBy: string;
  completed?: boolean;
}

interface ReportBacklog {
  id: string;
  track: string;
  task: string;
  from: string;
  assignee: string;
  taskLink?: string;
  completionBy: string;
}

interface ReportGoal {
  id: string;
  track: string;
  task: string;
  from: string;
  assignee: string;
  taskLink?: string;
  completionBy: string;
  status: string;
}

interface WeeklyReportData {
  weekLabel: string;
  lastWeekLabel: string;
  currentWeekDeliverables: ReportDeliverable[];
  backlogs: ReportBacklog[];
  lastWeekGoals: ReportGoal[];
}

const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDefaultDates = () => {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const lastMon = new Date(mon);
  lastMon.setDate(mon.getDate() - 7);
  const lastFri = new Date(lastMon);
  lastFri.setDate(lastMon.getDate() + 4);
  return {
    weekStart: toInputDate(mon),
    weekEnd: toInputDate(fri),
    lastWeekStart: toInputDate(lastMon),
    lastWeekEnd: toInputDate(lastFri),
  };
};

const escapeHtml = (str: string) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  productGroups,
}) => {
  const defaults = getDefaultDates();
  const [weekStart, setWeekStart] = useState(defaults.weekStart);
  const [weekEnd, setWeekEnd] = useState(defaults.weekEnd);
  const [lastWeekStart, setLastWeekStart] = useState(defaults.lastWeekStart);
  const [lastWeekEnd, setLastWeekEnd] = useState(defaults.lastWeekEnd);
  const [productFilter, setProductFilter] = useState('All');
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: 'weekly-report',
        weekStart,
        weekEnd,
        lastWeekStart,
        lastWeekEnd,
        product: productFilter,
      });
      const headers: Record<string, string> = {};
      const userId = localStorage.getItem('logged-in-user-id');
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch(`/api/data?${params.toString()}`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to generate weekly report.');
      } else {
        setReport(json.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading weekly report.');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, lastWeekStart, lastWeekEnd, productFilter]);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, loadReport]);

  if (!isOpen) return null;

  const buildReportHtml = (data: WeeklyReportData) => {
    const scopeText = productFilter !== 'All' ? ` for ${escapeHtml(productFilter)}` : '';
    const tableStyle = 'border-collapse:collapse;width:100%;font-family:inherit;font-size:0.85rem;margin-bottom:16px;';
    const cellStyle = 'border:1px solid #999999;padding:4px 6px;text-align:left;vertical-align:top;font-weight:normal;color:#000000;';

    const renderRows = (rows: string[], colCount: number) =>
      rows.length > 0
        ? rows.join('')
        : `<tr><td colspan="${colCount}" style="${cellStyle}">No items</td></tr>`;

    const renderClickupCell = (taskLink?: string) => {
      const clean = (taskLink || '').trim();
      if (!clean) return `<td style="${cellStyle}"></td>`;
      return `<td style="${cellStyle}"><a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer">ClickUp</a></td>`;
    };

    const deliverablesRows = data.currentWeekDeliverables.map(
      (r) =>
        `<tr>
          <td style="${cellStyle}">${escapeHtml(r.track)}</td>
          <td style="${cellStyle}">${escapeHtml(r.task)}</td>
          <td style="${cellStyle}">${escapeHtml(r.from)}</td>
          <td style="${cellStyle}">${escapeHtml(r.assignee)}</td>
          <td style="${cellStyle}">${escapeHtml(r.completionBy)}</td>
          ${renderClickupCell(r.taskLink)}
        </tr>`
    );

    const backlogRows = data.backlogs.map(
      (r) =>
        `<tr>
          <td style="${cellStyle}">${escapeHtml(r.track)}</td>
          <td style="${cellStyle}">${escapeHtml(r.task)}</td>
          <td style="${cellStyle}">${escapeHtml(r.from)}</td>
          <td style="${cellStyle}">${escapeHtml(r.assignee)}</td>
          <td style="${cellStyle}">${escapeHtml(r.completionBy)}</td>
          ${renderClickupCell(r.taskLink)}
        </tr>`
    );

    const lastWeekRows = data.lastWeekGoals.map(
      (r) =>
        `<tr>
          <td style="${cellStyle}">${escapeHtml(r.track)}</td>
          <td style="${cellStyle}">${escapeHtml(r.task)}</td>
          <td style="${cellStyle}">${escapeHtml(r.from)}</td>
          <td style="${cellStyle}">${escapeHtml(r.assignee)}</td>
          <td style="${cellStyle}">${escapeHtml(r.completionBy)}</td>
          <td style="${cellStyle}">${escapeHtml(r.status)}</td>
          ${renderClickupCell(r.taskLink)}
        </tr>`
    );

    return `
      <div style="font-family:inherit;font-size:0.875rem;color:#000000;line-height:1.4;">
        <p>Hi Team,</p>
        <p>Please find below the weekly deliverables, in-progress scopes, and release pipeline${scopeText}.</p>

        <p style="margin:14px 0 4px 0;">${escapeHtml(data.weekLabel)}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="${tableStyle}">
          <thead>
            <tr>
              <th style="${cellStyle}">Track</th>
              <th style="${cellStyle}">Task</th>
              <th style="${cellStyle}">From</th>
              <th style="${cellStyle}">Assignee</th>
              <th style="${cellStyle}">Completion By</th>
              <th style="${cellStyle}">ClickUp</th>
            </tr>
          </thead>
          <tbody>${renderRows(deliverablesRows, 6)}</tbody>
        </table>

        <p style="margin:18px 0 4px 0;">Backlogs</p>
        <table border="1" cellspacing="0" cellpadding="4" style="${tableStyle}">
          <thead>
            <tr>
              <th style="${cellStyle}">Track</th>
              <th style="${cellStyle}">Task</th>
              <th style="${cellStyle}">From</th>
              <th style="${cellStyle}">Assignee</th>
              <th style="${cellStyle}">Completion By</th>
              <th style="${cellStyle}">ClickUp</th>
            </tr>
          </thead>
          <tbody>${renderRows(backlogRows, 6)}</tbody>
        </table>

        <p style="margin:18px 0 4px 0;">Last Week Goals Update (${escapeHtml(data.lastWeekLabel)})</p>
        <table border="1" cellspacing="0" cellpadding="4" style="${tableStyle}">
          <thead>
            <tr>
              <th style="${cellStyle}">Track</th>
              <th style="${cellStyle}">Task</th>
              <th style="${cellStyle}">From</th>
              <th style="${cellStyle}">Assignee</th>
              <th style="${cellStyle}">Completion By</th>
              <th style="${cellStyle}">Status</th>
              <th style="${cellStyle}">ClickUp</th>
            </tr>
          </thead>
          <tbody>${renderRows(lastWeekRows, 7)}</tbody>
        </table>

        <p style="margin-top:14px;">We need to share support docs and include them in the weekly calls according to these goals.</p>
      </div>
    `;
  };

  const handleDownloadDoc = () => {
    if (!report) return;
    const innerHtml = buildReportHtml(report);
    const wordDoc = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Weekly Update - ${escapeHtml(report.weekLabel)}</title>
        <style>
          @page { size: A4 landscape; margin: 1.5cm; }
        </style>
      </head>
      <body>${innerHtml}</body>
      </html>
    `;
    const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeLabel = report.weekLabel.replace(/[^a-zA-Z0-9_-]+/g, '_');
    link.download = `Weekly_Update_${safeLabel}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyHtml = async () => {
    if (!report) return;
    const html = buildReportHtml(report);
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()], {
        type: 'text/plain',
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--background-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Weekly Update Doc Exporter
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'var(--panel-bg)',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Week Start
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Week End
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Last Week Start
            <input
              type="date"
              value={lastWeekStart}
              onChange={(e) => setLastWeekStart(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Last Week End
            <input
              type="date"
              value={lastWeekEnd}
              onChange={(e) => setLastWeekEnd(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Product Group
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
              }}
            >
              <option value="All">All Products</option>
              {productGroups.map((pg) => (
                <option key={pg.id || pg.name} value={pg.name}>
                  {pg.name}
                </option>
              ))}
            </select>
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadReport}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '32px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyHtml}
              disabled={!report || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '32px' }}
            >
              {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy for Email'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownloadDoc}
              disabled={!report || loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', height: '32px' }}
            >
              <Download size={13} />
              Download .doc
            </button>
          </div>
        </div>

        {/* Preview Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            color: '#0f172a',
          }}
        >
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.6rem', color: '#64748b' }}>
              <RefreshCw size={18} className="animate-spin" />
              <span>Extracting weekly data from platform...</span>
            </div>
          )}
          {error && (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          {!loading && !error && report && (
            <div dangerouslySetInnerHTML={{ __html: buildReportHtml(report) }} />
          )}
        </div>
      </div>
    </div>
  );
};
