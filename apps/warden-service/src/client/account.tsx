import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Effect } from 'effect';
import { dashboardApi } from './api.js';
import type { PersonalToken } from './api.js';
import { useAction, useQuery } from './runtime.js';
import { formatDate } from './format.js';

interface TokenRowProps {
  token: PersonalToken;
  refresh: () => void;
}

function TokenRow({ token, refresh }: TokenRowProps): JSX.Element {
  const action = useAction();
  return (
    <div className="token-row">
      <div className="token-details">
        <strong>{token.name}</strong>
        <span>
          Ends in {token.tokenSuffix} · Expires {formatDate(token.expiresAt)}
        </span>
        {action.error && (
          <p className="form-error" role="alert">
            {action.error}
          </p>
        )}
      </div>
      <button
        type="button"
        className="quiet-button"
        disabled={action.pending}
        onClick={() => {
          void action.run(dashboardApi.revokeToken(token.id)).then((result) => {
            if (result) refresh();
          });
        }}
      >
        Revoke
      </button>
    </div>
  );
}

function TokenAccess(): JSX.Element {
  const [revision, setRevision] = useState(0);
  const tokens = useQuery(dashboardApi.tokens, revision);
  const create = useAction();
  const copy = useAction();
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refresh = () => setRevision((value) => value + 1);
  if (tokens.status === 'loading') return <div className="empty">Loading tokens</div>;
  if (tokens.status === 'error')
    return (
      <div className="error">
        Could not load API tokens. Try again.
        <button className="quiet-button" type="button" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  return (
    <>
      <form
        className="token-form"
        onSubmit={(event) => {
          event.preventDefault();
          void create.run(dashboardApi.createToken(name)).then((result) => {
            if (result) {
              setCreated(result.token);
              setCopied(false);
              setName('');
              refresh();
            }
          });
        }}
      >
        <label className="field">
          <span>Token name</span>
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Local agent"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" disabled={create.pending}>
          Create token
        </button>
        {create.error && (
          <p className="form-error" role="alert">
            Could not create the token. {create.error}
          </p>
        )}
      </form>
      {created && (
        <section className="token-created">
          <strong>Copy this token now</strong>
          <p>It will not be shown again.</p>
          <code>{created}</code>
          <button
            type="button"
            className="quiet-button"
            disabled={copy.pending}
            onClick={() => {
              void copy.run(dashboardApi.copy(created).pipe(Effect.as(true))).then((success) => {
                if (success) setCopied(true);
              });
            }}
          >
            {copied ? 'Copied' : 'Copy token'}
          </button>
          {copy.error && (
            <p role="alert" className="form-error">
              {copy.error}
            </p>
          )}
        </section>
      )}
      <div className="token-list">
        {tokens.data.tokens.length ? (
          tokens.data.tokens.map((token) => (
            <TokenRow key={token.id} token={token} refresh={refresh} />
          ))
        ) : (
          <div className="empty">No active API tokens.</div>
        )}
      </div>
    </>
  );
}

interface TokenDialogProps {
  close: () => void;
}

function TokenDialog({ close }: TokenDialogProps): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} id="api-dialog" aria-labelledby="api-dialog-title" onClose={close}>
      <header className="dialog-header">
        <div>
          <h2 id="api-dialog-title">API Access</h2>
          <p>Read-only tokens for agents and scripts. Tokens expire after 90 days.</p>
        </div>
        <button
          id="api-dialog-close"
          className="quiet-button"
          type="button"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
        >
          Close
        </button>
      </header>
      <div id="api-dialog-content">
        <TokenAccess />
      </div>
    </dialog>
  );
}

/** Load account controls without delaying the page; discard token secrets when the dialog closes. */
export function Account(): JSX.Element {
  const account = useQuery(dashboardApi.account);
  const signOut = useAction();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const canManage = account.status === 'success' && account.data.canManagePersonalTokens;
  const canSignOut = account.status === 'success' && !account.data.authDisabled;
  return (
    <>
      <div ref={menu} id="account-menu" className="account-menu" hidden={!canManage && !canSignOut}>
        <button
          ref={trigger}
          id="account-menu-trigger"
          className="account-menu-trigger"
          type="button"
          aria-controls="account-menu-popover"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`${open ? 'Close' : 'Open'} account menu`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="account-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </svg>
          </span>
          <svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        <div id="account-menu-popover" className="account-popover" hidden={!open}>
          <button
            id="api-access"
            className="account-menu-item"
            type="button"
            hidden={!canManage}
            onClick={() => {
              setOpen(false);
              setDialog(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="m11 12 9-9m-4 4 3 3m-1.5-5.5 2 2" />
            </svg>
            API access
          </button>
          <button
            id="sign-out"
            className="account-menu-item"
            type="button"
            hidden={!canSignOut}
            disabled={signOut.pending}
            onClick={() => {
              setOpen(false);
              void signOut.run(dashboardApi.signOut.pipe(Effect.as(true))).then((success) => {
                if (success) window.location.assign('/');
              });
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17 15 12 10 7m5 5H3m12-9h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            </svg>
            Sign out
          </button>
        </div>
        {signOut.error && (
          <p className="form-error" role="alert">
            {signOut.error}
          </p>
        )}
      </div>
      {dialog && (
        <TokenDialog
          close={() => {
            setDialog(false);
            trigger.current?.focus();
          }}
        />
      )}
    </>
  );
}
