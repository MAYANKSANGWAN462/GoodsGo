import Card from '../../components/common/Card';

/**
 * AdminReviewsPage — Informational page.
 *
 * No GET /admin/reviews endpoint exists in the backend (admin.routes.js).
 * Reviews are self-regulated: reviewers can delete their own reviews within
 * the edit window, and disputed reviews surface through the reports system.
 *
 * To add a review moderation list, add GET /admin/reviews to the backend first.
 */
export default function AdminReviewsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-text mb-2">Review Moderation</h1>
      <p className="text-sm text-text-muted mb-6">
        Review management for administrators.
      </p>

      <Card padding="md">
        <h2 className="text-base font-semibold text-text mb-2">How review moderation works</h2>
        <ul className="text-sm text-text-muted space-y-2 list-disc list-inside">
          <li>
            Reviewers can delete their own reviews within the <strong>edit window</strong>{' '}
            (configured in platform settings).
          </li>
          <li>
            Disputed or abusive reviews should be reported by users through the report
            feature on the reviewer's profile.
          </li>
          <li>
            Reported reviews appear in the <strong>Reports</strong> section, where
            moderators can resolve or dismiss them.
          </li>
          <li>
            Individual user review histories are visible on each user's detail page.
          </li>
        </ul>
      </Card>

      <div className="mt-6 p-4 bg-amber-50 border border-warning rounded-lg">
        <p className="text-sm text-warning font-medium">Backend Note</p>
        <p className="text-sm text-text-muted mt-1">
          A <code className="bg-amber-100 px-1 rounded">GET /admin/reviews</code> endpoint
          does not exist. To add a review list view, add the endpoint to{' '}
          <code className="bg-amber-100 px-1 rounded">admin.routes.js</code> and{' '}
          <code className="bg-amber-100 px-1 rounded">admin.service.js</code> in the backend.
        </p>
      </div>
    </div>
  );
}
