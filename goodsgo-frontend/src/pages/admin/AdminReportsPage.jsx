import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  useAdminReports, useResolveReport, useDismissReport,
  useAdminDisputes, useResolveDispute,
} from '../../hooks/useAdmin';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { formatDate } from '../../utils/formatters';

// ── Reports Tab ─────────────────────────────────────────────────────────────

const REPORT_STATUS_OPTIONS = [
  { value: '',         label: 'All Reports' },
  { value: 'pending',  label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const RESOLVE_ACTION_OPTIONS = [
  { value: 'warn_user',     label: 'Warn user' },
  { value: 'hide_post',     label: 'Hide post' },
  { value: 'suspend_user',  label: 'Suspend user' },
  { value: 'no_action',     label: 'No action needed' },
];

function ReportRow({ report, onResolve, onDismiss }) {
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors align-top">
      <td className="py-3 px-4 text-sm">
        <p className="font-medium text-text">{report.reason}</p>
        <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{report.description}</p>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{report.reporterName ?? report.reporterId}</td>
      <td className="py-3 px-4 text-sm text-text-muted">{report.postId ?? '—'}</td>
      <td className="py-3 px-4">
        <Badge
          variant={
            report.status === 'pending'  ? 'warning' :
            report.status === 'resolved' ? 'success' :
            'neutral'
          }
          size="sm"
        >
          {report.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{formatDate(report.createdAt)}</td>
      <td className="py-3 px-4">
        {report.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => onResolve(report)}>Resolve</Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(report)}>Dismiss</Button>
          </div>
        )}
      </td>
    </tr>
  );
}

ReportRow.propTypes = {
  report:    PropTypes.object.isRequired,
  onResolve: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

function ReportsTab() {
  const [status, setStatus] = useState('pending');
  const [page, setPage]     = useState(1);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [dismissTarget, setDismissTarget] = useState(null);
  const [resolveAction, setResolveAction] = useState('no_action');
  const [adminNotes, setAdminNotes]       = useState('');

  const { data, isLoading, isError } = useAdminReports({ status: status || undefined, page, limit: 20 });
  const resolveMutation = useResolveReport();
  const dismissMutation = useDismissReport();

  const reports    = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  function handleResolve() {
    if (!resolveTarget) return;
    resolveMutation.mutate(
      { reportId: resolveTarget.id, body: { adminNotes, action: resolveAction } },
      { onSuccess: () => { setResolveTarget(null); setAdminNotes(''); setResolveAction('no_action'); } }
    );
  }

  function handleDismiss() {
    if (!dismissTarget) return;
    dismissMutation.mutate(
      { reportId: dismissTarget.id, body: { adminNotes } },
      { onSuccess: () => { setDismissTarget(null); setAdminNotes(''); } }
    );
  }

  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="sm:w-48">
          <Select
            id="reportStatus"
            options={REPORT_STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <EmptyState title="Failed to load reports" message="Please try refreshing." />
      ) : reports.length === 0 ? (
        <EmptyState title="No reports found" message="Try changing the status filter." />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="py-3 px-4">Reason / Description</th>
                <th className="py-3 px-4">Reporter</th>
                <th className="py-3 px-4">Post ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reported</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <ReportRow key={r.id} report={r} onResolve={setResolveTarget} onDismiss={setDismissTarget} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>

      {/* Resolve modal */}
      <Modal
        isOpen={!!resolveTarget}
        onClose={() => { setResolveTarget(null); setAdminNotes(''); }}
        title="Resolve Report"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setResolveTarget(null); setAdminNotes(''); }} disabled={resolveMutation.isPending}>Cancel</Button>
            <Button variant="primary" onClick={handleResolve} isLoading={resolveMutation.isPending}>Resolve</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            id="resolveAction"
            label="Action taken"
            options={RESOLVE_ACTION_OPTIONS}
            value={resolveAction}
            onChange={(e) => setResolveAction(e.target.value)}
          />
          <Input
            id="resolveNotes"
            label="Admin notes (optional)"
            placeholder="Notes for the audit log…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>
      </Modal>

      {/* Dismiss modal */}
      <Modal
        isOpen={!!dismissTarget}
        onClose={() => { setDismissTarget(null); setAdminNotes(''); }}
        title="Dismiss Report"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDismissTarget(null); setAdminNotes(''); }} disabled={dismissMutation.isPending}>Cancel</Button>
            <Button variant="secondary" onClick={handleDismiss} isLoading={dismissMutation.isPending}>Dismiss</Button>
          </>
        }
      >
        <Input
          id="dismissNotes"
          label="Admin notes (optional)"
          placeholder="Reason for dismissal…"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
      </Modal>
    </>
  );
}

// ── Disputes Tab ─────────────────────────────────────────────────────────────

const DISPUTE_STATUS_OPTIONS = [
  { value: '',            label: 'All Disputes' },
  { value: 'open',        label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved',    label: 'Resolved' },
];

const DISPUTE_RESOLVE_STATUS_OPTIONS = [
  { value: 'resolved_for_requester',  label: 'Resolved for requester' },
  { value: 'resolved_for_transporter', label: 'Resolved for transporter' },
  { value: 'resolved_mutually',       label: 'Resolved mutually' },
];

function DisputeRow({ dispute, onResolve }) {
  return (
    <tr className="border-b border-border hover:bg-surface-alt transition-colors align-top">
      <td className="py-3 px-4 text-sm">
        <p className="font-medium text-text">{dispute.reason}</p>
        <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{dispute.description}</p>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted font-mono text-xs">{dispute.bookingId}</td>
      <td className="py-3 px-4">
        <Badge variant={dispute.status === 'open' ? 'danger' : dispute.status === 'resolved' ? 'success' : 'warning'} size="sm">
          {dispute.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">{formatDate(dispute.createdAt)}</td>
      <td className="py-3 px-4">
        {dispute.status !== 'resolved' && (
          <Button size="sm" variant="primary" onClick={() => onResolve(dispute)}>Resolve</Button>
        )}
      </td>
    </tr>
  );
}

DisputeRow.propTypes = {
  dispute:   PropTypes.object.isRequired,
  onResolve: PropTypes.func.isRequired,
};

function DisputesTab() {
  const [status, setStatus] = useState('open');
  const [page, setPage]     = useState(1);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved_mutually');
  const [adminNotes, setAdminNotes]       = useState('');

  const { data, isLoading, isError } = useAdminDisputes({ status: status || undefined, page, limit: 20 });
  const resolveMutation = useResolveDispute();

  const disputes   = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  function handleResolve() {
    if (!resolveTarget) return;
    resolveMutation.mutate(
      { disputeId: resolveTarget.id, body: { status: resolveStatus, adminNotes } },
      { onSuccess: () => { setResolveTarget(null); setAdminNotes(''); } }
    );
  }

  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="sm:w-48">
          <Select
            id="disputeStatus"
            options={DISPUTE_STATUS_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : isError ? (
        <EmptyState title="Failed to load disputes" message="Please try refreshing." />
      ) : disputes.length === 0 ? (
        <EmptyState title="No disputes found" message="Try changing the status filter." />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-text-muted text-xs font-semibold uppercase tracking-wide">
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Filed</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => (
                <DisputeRow key={d.id} dispute={d} onResolve={setResolveTarget} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal
        isOpen={!!resolveTarget}
        onClose={() => { setResolveTarget(null); setAdminNotes(''); }}
        title="Resolve Dispute"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setResolveTarget(null); setAdminNotes(''); }} disabled={resolveMutation.isPending}>Cancel</Button>
            <Button variant="primary" onClick={handleResolve} isLoading={resolveMutation.isPending}>Resolve Dispute</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            id="disputeResolveStatus"
            label="Resolution outcome"
            options={DISPUTE_RESOLVE_STATUS_OPTIONS}
            value={resolveStatus}
            onChange={(e) => setResolveStatus(e.target.value)}
          />
          <Input
            id="disputeAdminNotes"
            label="Admin notes"
            placeholder="Explain the resolution decision…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [tab, setTab] = useState('reports');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Reports &amp; Disputes</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { key: 'reports',  label: 'Reports' },
          { key: 'disputes', label: 'Disputes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports'  && <ReportsTab />}
      {tab === 'disputes' && <DisputesTab />}
    </div>
  );
}
