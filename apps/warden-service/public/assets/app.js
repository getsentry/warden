const content = document.querySelector('#content');
const filterHost = document.querySelector('#filters');
const accountMenu = document.querySelector('#account-menu');
const accountMenuTrigger = document.querySelector('#account-menu-trigger');
const accountMenuPopover = document.querySelector('#account-menu-popover');
const signOut = document.querySelector('#sign-out');
const apiAccess = document.querySelector('#api-access');
const apiDialog = document.querySelector('#api-dialog');
const apiDialogContent = document.querySelector('#api-dialog-content');
const apiDialogClose = document.querySelector('#api-dialog-close');
let dimensions;
let filterTimer;
let renderVersion = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function link(text, href, className = 'text-link') {
  const node = element('a', text, className);
  node.href = href;
  return node;
}

function formatCost(value) {
  return value === null || value === undefined
    ? 'Unknown'
    : new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value ?? 0);
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Never';
}

function setAccountMenuOpen(open) {
  accountMenuTrigger.setAttribute('aria-expanded', String(open));
  accountMenuTrigger.setAttribute('aria-label', `${open ? 'Close' : 'Open'} account menu`);
  accountMenuPopover.hidden = !open;
}

function metric(label, value) {
  const card = element('div', undefined, 'metric');
  card.append(element('span', label), element('strong', value));
  return card;
}

function metrics(entries) {
  const summary = element('div', undefined, 'metrics');
  for (const [label, value] of entries) summary.append(metric(label, value));
  return summary;
}

function sectionHeader(title, description) {
  const header = element('div', undefined, 'section-header');
  header.append(element('h2', title));
  if (description) header.append(element('p', description));
  return header;
}

function empty(message) {
  return element('div', message, 'empty');
}

async function api(path, options) {
  const { headers = {}, ...requestOptions } = options ?? {};
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...requestOptions,
    headers: { accept: 'application/json', ...headers },
  });
  if (!response.ok) {
    const error = new Error(response.status === 401
      ? 'Authentication required.'
      : 'Could not load service data. Try again.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function tokenRow(token) {
  const row = element('div', undefined, 'token-row');
  const details = element('div', undefined, 'token-details');
  details.append(
    element('strong', token.name),
    element('span', `Ends in ${token.tokenSuffix} · Expires ${formatDate(token.expiresAt)}`),
  );
  const revoke = element('button', 'Revoke', 'quiet-button');
  revoke.type = 'button';
  revoke.addEventListener('click', async () => {
    revoke.disabled = true;
    try {
      await api(`/api/v1/personal-tokens/${encodeURIComponent(token.id)}`, { method: 'DELETE' });
      await renderApiAccess();
    } catch {
      revoke.disabled = false;
    }
  });
  row.append(details, revoke);
  return row;
}

async function renderApiAccess() {
  apiDialogContent.replaceChildren(empty('Loading tokens'));
  try {
    const data = await api('/api/v1/personal-tokens');
    const body = document.createDocumentFragment();
    const form = element('form', undefined, 'token-form');
    const label = element('label', undefined, 'field');
    label.append(element('span', 'Token name'));
    const input = document.createElement('input');
    input.name = 'name';
    input.required = true;
    input.maxLength = 80;
    input.placeholder = 'Local agent';
    label.append(input);
    const create = element('button', 'Create token');
    create.type = 'submit';
    const error = element('p', '', 'form-error');
    form.append(label, create, error);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      create.disabled = true;
      error.textContent = '';
      try {
        const created = await api('/api/v1/personal-tokens', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: input.value }),
        });
        const notice = element('section', undefined, 'token-created');
        notice.append(
          element('strong', 'Copy this token now'),
          element('p', 'It will not be shown again.'),
        );
        const tokenValue = element('code', created.token);
        const copy = element('button', 'Copy token', 'quiet-button');
        copy.type = 'button';
        copy.addEventListener('click', async () => {
          await navigator.clipboard.writeText(created.token);
          copy.textContent = 'Copied';
        });
        notice.append(tokenValue, copy);
        input.value = '';
        form.after(notice);
        const list = apiDialogContent.querySelector('.token-list');
        if (list) list.prepend(tokenRow(created));
      } catch {
        error.textContent = 'Could not create the token. Try again.';
      } finally {
        create.disabled = false;
      }
    });
    body.append(form);
    const list = element('div', undefined, 'token-list');
    if (data.tokens.length) {
      for (const token of data.tokens) list.append(tokenRow(token));
    } else {
      list.append(empty('No active API tokens.'));
    }
    body.append(list);
    apiDialogContent.replaceChildren(body);
  } catch {
    apiDialogContent.replaceChildren(element('div', 'Could not load API tokens. Try again.', 'error'));
  }
}

async function loadDimensions() {
  if (dimensions) return dimensions;
  const [repositories, skills] = await Promise.all([
    api('/api/v1/repositories'),
    api('/api/v1/skills'),
  ]);
  const nameCounts = new Map();
  for (const item of repositories.items) {
    nameCounts.set(item.repository.fullName, (nameCounts.get(item.repository.fullName) ?? 0) + 1);
  }
  dimensions = {
    repositories: repositories.items
      .map((item) => ({
        value: item.id,
        label: nameCounts.get(item.repository.fullName) > 1
          ? `${item.repository.fullName} (${item.repository.provider})`
          : item.repository.fullName,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    skills: skills.items
      .map((item) => ({ value: item.skill, label: item.skill }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  };
  return dimensions;
}

function field(params, config) {
  const wrapper = element('label', undefined, `field${config.className ? ` ${config.className}` : ''}`);
  wrapper.append(element('span', config.label));
  let control;
  if (config.options) {
    control = document.createElement('select');
    for (const option of config.options) {
      const node = element('option', option.label);
      node.value = option.value;
      node.selected = (params.get(config.name) ?? '') === option.value;
      control.append(node);
    }
  } else {
    control = document.createElement('input');
    control.type = config.type ?? 'search';
    control.placeholder = config.placeholder ?? '';
    control.value = params.get(config.name) ?? '';
  }
  control.name = config.name;
  wrapper.append(control);
  return wrapper;
}

function filterOptions(items, allLabel) {
  return [{ value: '', label: allLabel }, ...items];
}

function applyFilters(form) {
  const next = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    const normalized = String(value).trim();
    if (normalized) next.set(name, normalized);
  }
  const query = next.toString();
  history.replaceState({}, '', `/${query ? `?${query}` : ''}`);
  render();
}

async function renderFilters() {
  const available = await loadDimensions();
  const params = new URLSearchParams(location.search);
  const form = element('form', undefined, 'filter-bar');
  form.append(field(params, {
    name: 'query',
    label: 'Search findings',
    placeholder: 'Title, description, or path',
    className: 'search-field',
  }));
  form.append(
    field(params, {
      name: 'repositoryId',
      label: 'Repository',
      options: filterOptions(available.repositories, 'All repositories'),
    }),
    field(params, {
      name: 'skill',
      label: 'Skill',
      options: filterOptions(available.skills, 'All skills'),
    }),
    field(params, {
      name: 'range',
      label: 'Time',
      options: [
        { value: '', label: 'All time' },
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
      ],
    }),
  );
  form.append(
    field(params, {
      name: 'severity',
      label: 'Severity',
      options: [
        { value: '', label: 'All severities' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    }),
    field(params, {
      name: 'findingOutcome',
      label: 'Finding status',
      options: [
        { value: '', label: 'Any status' },
        { value: 'posted', label: 'Posted' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'revised', label: 'Revised' },
        { value: 'deduped', label: 'Deduped' },
        { value: 'skipped', label: 'Skipped' },
        { value: 'failed', label: 'Failed' },
      ],
    }),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(filterTimer);
    applyFilters(form);
  });
  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLSelectElement) {
      clearTimeout(filterTimer);
      applyFilters(form);
    }
  });
  form.querySelector('[name="query"]').addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => applyFilters(form), 250);
  });
  filterHost.replaceChildren(form);
  filterHost.hidden = false;
}

function commonApiParams(params) {
  const result = new URLSearchParams();
  for (const name of ['repositoryId', 'skill']) {
    const value = params.get(name);
    if (value) result.set(name, value);
  }
  const days = Number(params.get('range'));
  if (Number.isFinite(days) && days > 0) {
    result.set('from', new Date(Date.now() - days * 86_400_000).toISOString());
  }
  return result;
}

function apiPath(path, params) {
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}`;
}

function barBreakdown(title, data, dimension) {
  const panel = element('section', undefined, 'panel');
  const heading = element('div', undefined, 'panel-heading');
  heading.append(element('h2', title), element('span', 'Known cost'));
  panel.append(heading);
  const groups = [...data.groups]
    .sort((left, right) => (right.costUsd ?? 0) - (left.costUsd ?? 0))
    .slice(0, 7);
  if (!groups.length) {
    panel.append(empty('No usage in this range.'));
    return panel;
  }
  const max = Math.max(...groups.map((group) => group.costUsd ?? 0), 0.000001);
  const list = element('div', undefined, 'bar-list');
  for (const group of groups) {
    const row = element('div', undefined, 'bar-row');
    const label = element('div', undefined, 'bar-label');
    label.append(element('span', group.dimensions[dimension]), element('span', formatCost(group.costUsd)));
    const track = element('div', undefined, 'bar-track');
    const fill = element('div', undefined, 'bar-fill');
    fill.style.width = `${Math.max(1, ((group.costUsd ?? 0) / max) * 100)}%`;
    track.append(fill);
    row.append(label, track);
    list.append(row);
  }
  panel.append(list);
  return panel;
}

function dailyChart(data) {
  const panel = element('section', undefined, 'panel');
  const heading = element('div', undefined, 'panel-heading');
  heading.append(element('h2', 'Cost over time'), element('span', 'Last 30 active days'));
  panel.append(heading);
  const groups = [...data.groups]
    .sort((left, right) => left.dimensions.day.localeCompare(right.dimensions.day))
    .slice(-30);
  if (!groups.length) {
    panel.append(empty('No usage in this range.'));
    return panel;
  }
  const max = Math.max(...groups.map((group) => group.costUsd ?? 0), 0.000001);
  const chart = element('div', undefined, 'daily-chart');
  for (const group of groups) {
    const column = element('div', undefined, 'daily-column');
    column.title = `${group.dimensions.day}: ${formatCost(group.costUsd)}`;
    const bar = element('div', undefined, 'daily-bar');
    bar.style.height = `${Math.max(2, ((group.costUsd ?? 0) / max) * 100)}%`;
    column.append(bar);
    chart.append(column);
  }
  const caption = element('div', undefined, 'chart-caption');
  caption.append(
    element('span', groups[0].dimensions.day),
    element('span', groups.at(-1).dimensions.day),
  );
  panel.append(chart, caption);
  return panel;
}

function findingLocation(finding) {
  if (!finding.location) return '—';
  const end = finding.location.endLine && finding.location.endLine !== finding.location.startLine
    ? `-${finding.location.endLine}`
    : '';
  return `${finding.location.path}:${finding.location.startLine}${end}`;
}

function findingDetail(label, value) {
  const item = element('div', undefined, 'finding-detail-item');
  item.append(element('dt', label), element('dd', value));
  return item;
}

function findingRows(finding) {
  const row = document.createElement('tr');
  row.className = 'finding-row';
  row.tabIndex = 0;
  row.setAttribute('aria-expanded', 'false');

  const severity = element('td', undefined, 'finding-severity');
  severity.append(element('span', finding.severity, `severity ${finding.severity}`));

  const summary = element('td', undefined, 'finding-summary');
  const summaryLayout = element('div', undefined, 'finding-summary-layout');
  const disclosure = element('span', undefined, 'finding-disclosure');
  disclosure.setAttribute('aria-hidden', 'true');
  const summaryText = element('div', undefined, 'finding-summary-text');
  summaryText.append(
    element('div', finding.title, 'finding-title'),
    element('div', finding.description, 'finding-description'),
  );
  summaryLayout.append(disclosure, summaryText);
  summary.append(summaryLayout);

  const context = element('td', undefined, 'finding-context');
  context.append(
    element('div', finding.repository.fullName),
    element('div', finding.skill, 'finding-skill'),
  );

  const locationText = findingLocation(finding);
  const location = element('td', locationText, 'finding-location');
  location.title = locationText;

  const status = element('td', finding.outcome ?? '—', `finding-status ${finding.outcome ?? ''}`);
  const seen = document.createElement('td');
  const time = element('time', formatDate(finding.completedAt));
  time.dateTime = finding.completedAt;
  seen.append(time);

  row.append(severity, summary, context, location, status, seen);

  const detailRow = document.createElement('tr');
  detailRow.id = `finding-detail-${finding.id}`;
  detailRow.className = 'finding-detail-row';
  detailRow.hidden = true;
  const detailCell = document.createElement('td');
  detailCell.colSpan = 6;
  const detailContent = element('div', undefined, 'finding-detail-content');
  const description = element('div', undefined, 'finding-detail-copy');
  description.append(
    element('div', 'Description', 'finding-detail-label'),
    element('p', finding.description, 'finding-detail-description'),
  );
  const metadata = element('dl', undefined, 'finding-detail-metadata');
  metadata.append(
    findingDetail('Repository', finding.repository.fullName),
    findingDetail('Skill', finding.skill),
    findingDetail('Location', locationText),
    findingDetail('Confidence', finding.confidence ?? 'Not reported'),
    findingDetail('Status', finding.outcome ?? 'Not reported'),
    findingDetail('Observed', finding.observedAt ? formatDate(finding.observedAt) : 'Not reported'),
  );
  detailContent.append(description, metadata);
  detailCell.append(detailContent);
  detailRow.append(detailCell);

  row.setAttribute('aria-controls', detailRow.id);
  function toggleFinding() {
    const expanded = row.getAttribute('aria-expanded') !== 'true';
    row.setAttribute('aria-expanded', String(expanded));
    detailRow.hidden = !expanded;
  }
  row.addEventListener('click', toggleFinding);
  row.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleFinding();
  });

  return [row, detailRow];
}

function findingsSection(data, params) {
  const section = element('section', undefined, 'section');
  section.append(sectionHeader('Findings', `${data.items.length} shown, newest first`));
  if (!data.items.length) {
    section.append(empty('No findings match these filters.'));
    return section;
  }
  const tableShell = element('div', undefined, 'finding-table-shell');
  const table = document.createElement('table');
  table.className = 'finding-table';
  const head = document.createElement('thead');
  const headings = document.createElement('tr');
  for (const label of ['Severity', 'Finding', 'Repository / skill', 'Location', 'Status', 'Seen']) {
    const heading = element('th', label);
    heading.scope = 'col';
    headings.append(heading);
  }
  head.append(headings);
  const body = document.createElement('tbody');
  for (const finding of data.items) body.append(...findingRows(finding));
  table.append(head, body);
  tableShell.append(table);
  section.append(tableShell);
  if (data.nextCursor) {
    const next = new URLSearchParams(params);
    next.set('cursor', data.nextCursor);
    const pagination = element('div', undefined, 'pagination');
    pagination.append(link('Next page', `/?${next}`, 'text-link'));
    section.append(pagination);
  }
  return section;
}

async function renderExplore(version) {
  if (!filterHost.querySelector('form')) await renderFilters();
  if (version !== renderVersion) return;
  const params = new URLSearchParams(location.search);
  const common = commonApiParams(params);
  const findings = new URLSearchParams(common);
  for (const name of ['query', 'severity']) {
    const value = params.get(name);
    if (value) findings.set(name, value);
  }
  if (params.get('findingOutcome')) findings.set('outcome', params.get('findingOutcome'));
  if (params.get('cursor')) findings.set('cursor', params.get('cursor'));
  findings.set('limit', '30');

  const dayCosts = new URLSearchParams(common);
  dayCosts.set('groupBy', 'day');
  const repositoryCosts = new URLSearchParams(common);
  repositoryCosts.set('groupBy', 'repository');
  const skillCosts = new URLSearchParams(common);
  skillCosts.set('groupBy', 'skill');
  const [outcomes, feed] = await Promise.all([
    api(apiPath('/api/v1/outcomes/summary', common)),
    api(apiPath('/api/v1/findings', findings)),
  ]);
  const byDay = await api(apiPath('/api/v1/costs', dayCosts));
  const byRepository = await api(apiPath('/api/v1/costs', repositoryCosts));
  const bySkill = await api(apiPath('/api/v1/costs', skillCosts));
  if (version !== renderVersion) return;
  const totals = outcomes.totals;
  const section = document.createDocumentFragment();
  section.append(metrics([
    ['Runs', formatNumber(totals.runs)],
    ['Findings', formatNumber(totals.findings)],
    ['Known cost', formatCost(totals.costUsd)],
    ['Failed runs', formatNumber(totals.failed)],
  ]));
  const analytics = element('section', undefined, 'section');
  analytics.append(sectionHeader('Cost', 'Reported and estimated usage'));
  const grid = element('div', undefined, 'analytics-grid');
  grid.append(
    dailyChart(byDay),
    barBreakdown('By repository', byRepository, 'repository'),
    barBreakdown('By skill', bySkill, 'skill'),
  );
  analytics.append(grid);
  section.append(analytics, findingsSection(feed, params));
  content.replaceChildren(section);
}

async function render() {
  const version = ++renderVersion;
  if (location.pathname !== '/') history.replaceState({}, '', `/${location.search}`);
  if (!content.children.length || content.querySelector('.login-panel, .empty')) {
    content.replaceChildren(empty('Loading data'));
  }
  try {
    const authContext = await api('/api/v1/auth/context');
    if (version !== renderVersion) return;
    apiAccess.hidden = !authContext.canManagePersonalTokens;
    signOut.hidden = authContext.authDisabled;
    accountMenu.hidden = apiAccess.hidden && signOut.hidden;
    await renderExplore(version);
    if (version !== renderVersion) return;
  } catch (error) {
    if (version !== renderVersion) return;
    if (error instanceof Error && error.status === 401) {
      window.location.assign('/api/auth/login');
      return;
    }
    content.replaceChildren(element('div', error instanceof Error
      ? error.message
      : 'Could not load service data. Try again.', 'error'));
  }
}

signOut.addEventListener('click', async () => {
  setAccountMenuOpen(false);
  await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin' });
  window.location.assign('/');
});

apiAccess.addEventListener('click', async () => {
  setAccountMenuOpen(false);
  apiDialog.showModal();
  await renderApiAccess();
});

accountMenuTrigger.addEventListener('click', () => {
  setAccountMenuOpen(accountMenuTrigger.getAttribute('aria-expanded') !== 'true');
});

apiDialogClose.addEventListener('click', () => apiDialog.close());

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!accountMenu.contains(target)) setAccountMenuOpen(false);
  const anchor = target.closest('a');
  if (!anchor || anchor.origin !== location.origin || anchor.target) return;
  event.preventDefault();
  history.pushState({}, '', anchor.href);
  filterHost.replaceChildren();
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || accountMenuPopover.hidden) return;
  setAccountMenuOpen(false);
  accountMenuTrigger.focus();
});

window.addEventListener('popstate', () => {
  filterHost.replaceChildren();
  render();
});
render();
