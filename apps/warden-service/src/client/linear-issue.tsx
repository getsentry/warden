import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import type { LinearIssue } from '@sentry/warden-service-api';
import { dashboardApi } from './api.js';
import { useAction, useQuery } from './runtime.js';

interface LinearIssueActionProps {
  findingId: string;
}

/** Create a ticket through the service, or open the ticket already linked to this finding. */
export function LinearIssueAction({ findingId }: LinearIssueActionProps): JSX.Element | null {
  const [revision, setRevision] = useState(0);
  const request = useMemo(() => dashboardApi.linearIssue(findingId), [findingId]);
  const status = useQuery(request, revision);
  const create = useAction();
  const [created, setCreated] = useState<LinearIssue | null>(null);
  if (status.status === 'success' && !status.data.enabled) return null;
  const issue = created ?? (status.status === 'success' ? status.data.issue : null);
  if (issue) {
    return (
      <a
        className="finding-linear-link quiet-button"
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        View {issue.identifier} in Linear
      </a>
    );
  }
  if (status.status === 'error') {
    return (
      <div className="finding-linear-actions">
        <button type="button" className="quiet-button" onClick={() => setRevision((value) => value + 1)}>
          Retry Linear
        </button>
        <p className="form-error" role="alert">{status.message}</p>
      </div>
    );
  }
  return (
    <div className="finding-linear-actions">
      <button
        type="button"
        className="quiet-button"
        disabled={status.status === 'loading' || create.pending}
        onClick={() => {
          void create.run(dashboardApi.createLinearIssue(findingId)).then((result) => {
            if (result) setCreated(result.issue);
          });
        }}
      >
        {create.pending ? 'Creating Linear issue…' : 'Create Linear issue'}
      </button>
      {create.error && <p className="form-error" role="alert">{create.error}</p>}
    </div>
  );
}
