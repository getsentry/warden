const DEFAULT_RANGE_DAYS = '30';
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
const pageTitle = document.querySelector('#page-title');
const pageDescription = document.querySelector('#page-description');
let dimensions;
let dimensionsPromise;
let accountPromise;
let filterTimer;
let renderVersion = 0;

const themeToggle = document.querySelector('#theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preferredTheme;
try {
  const saved = localStorage.getItem('warden.theme');
  if (saved === 'light' || saved === 'dark') preferredTheme = saved;
} catch {
  // Theme switching remains available when browser storage is disabled.
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'dark' ? 'Use light theme' : 'Use dark theme';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
}

setTheme(preferredTheme ?? (systemTheme.matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => {
  preferredTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(preferredTheme);
  try {
    localStorage.setItem('warden.theme', preferredTheme);
  } catch {
    // The selected theme still applies for the current page.
  }
});
systemTheme.addEventListener('change', (event) => {
  if (!preferredTheme) setTheme(event.matches ? 'dark' : 'light');
});

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

function dateTime(value, fallback = 'Not reported') {
  if (!value) return element('span', fallback);
  const time = element('time', formatDate(value));
  time.dateTime = value;
  time.title = new Date(value).toISOString();
  return time;
}

function findingOutcomeLabel(finding, fallback = 'Delivery not tracked') {
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'pull_request_changed') {
    return 'Not posted: PR changed';
  }
  if (!finding.outcome) return fallback;
  return finding.outcome.charAt(0).toUpperCase() + finding.outcome.slice(1);
}

function findingOutcomeDescription(finding) {
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'pull_request_changed') {
    return 'Warden did not post this finding because the pull request changed before Warden finished. It refers to an older commit; the newer run reviews the updated code.';
  }
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'review_not_posted') {
    return 'Skipped because Warden could not verify that the pull request was still current, so it did not add review feedback.';
  }
  if (!finding.outcome) {
    return 'Warden did not record how this finding was delivered. Scheduled scans and older runs may omit this data.';
  }
  return findingOutcomeLabel(finding);
}

function setPage(title, description) {
  pageTitle.textContent = title;
  pageDescription.textContent = description;
  document.title = `${title} · Warden`;
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
    let message = response.status === 401 ? 'Authentication required.' : 'Request failed. Try again.';
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // The status-based message covers non-JSON responses.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function loadAccount() {
  accountPromise ??= api('/api/v1/auth/context').then((authContext) => {
    apiAccess.hidden = !authContext.canManagePersonalTokens;
    signOut.hidden = authContext.authDisabled;
    accountMenu.hidden = apiAccess.hidden && signOut.hidden;
  }).catch((error) => {
    accountPromise = undefined;
    // Retry controls on navigation; data endpoints handle expired sessions.
    console.warn('Could not load account controls.', error);
  });
  return accountPromise;
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
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Try again.';
        error.textContent = `Could not create the token. ${detail}`;
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
  dimensionsPromise ??= api('/api/v1/history/dimensions').then((available) => {
    const nameCounts = new Map();
    for (const item of available.repositories) {
      nameCounts.set(item.repository.fullName, (nameCounts.get(item.repository.fullName) ?? 0) + 1);
    }
    dimensions = {
      repositories: available.repositories
        .map((item) => ({
          value: item.id,
          label: nameCounts.get(item.repository.fullName) > 1
            ? `${item.repository.fullName} (${item.repository.provider})`
            : item.repository.fullName,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      skills: available.skills
        .map((skill) => ({ value: skill, label: skill }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    };
    return dimensions;
  }).catch((error) => {
    dimensionsPromise = undefined;
    throw error;
  });
  return dimensionsPromise;
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

function dimensionFilterOptions(params, name, items, allLabel, pendingLabel) {
  const selected = params.get(name);
  const available = items ?? (selected ? [{ value: selected, label: pendingLabel ?? selected }] : []);
  return filterOptions(available, allLabel);
}

function replaceFilterOptions(control, items, allLabel) {
  const selected = new URLSearchParams(location.search).get(control.name) ?? control.value;
  control.replaceChildren();
  for (const option of filterOptions(items, allLabel)) {
    const node = element('option', option.label);
    node.value = option.value;
    control.append(node);
  }
  control.value = selected;
}

async function hydrateFilterDimensions(form) {
  if (!form.isConnected || form.dataset.dimensionsState) return;
  form.dataset.dimensionsState = 'loading';
  try {
    const available = await loadDimensions();
    if (!form.isConnected) return;
    replaceFilterOptions(form.elements.namedItem('repositoryId'), available.repositories, 'All repositories');
    replaceFilterOptions(form.elements.namedItem('skill'), available.skills, 'All skills');
    form.dataset.dimensionsState = 'loaded';
  } catch {
    delete form.dataset.dimensionsState;
  }
}

function listenForFilterDimensions(form) {
  const hydrate = () => hydrateFilterDimensions(form);
  for (const name of ['repositoryId', 'skill']) {
    const control = form.elements.namedItem(name);
    control.addEventListener('focus', hydrate);
    control.addEventListener('pointerdown', hydrate);
  }
}

function scheduleFilterDimensions(form) {
  const hydrate = () => hydrateFilterDimensions(form);
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(hydrate, { timeout: 2_000 });
    else setTimeout(hydrate, 0);
  });
}

function ensureDefaultRange() {
  const params = new URLSearchParams(location.search);
  if (params.get('range')) return;
  params.set('range', DEFAULT_RANGE_DAYS);
  history.replaceState({}, '', `/?${params}`);
}

function applyFilters(form) {
  const next = new URLSearchParams(location.search);
  next.delete('cursor');
  for (const [name, value] of new FormData(form)) {
    const normalized = String(value).trim();
    if (normalized) next.set(name, normalized);
    else next.delete(name);
  }
  const query = next.toString();
  history.replaceState({}, '', `/${query ? `?${query}` : ''}`);
  updateFilterSummary(form);
  render({ preserveContent: true });
}

function updateFilterSummary(form) {
  const summary = form.querySelector('.advanced-filters > summary');
  if (!summary) return;
  const chips = form.querySelector('.active-filters');
  chips.replaceChildren();
  for (const name of ['skill', 'severity']) {
    const control = form.elements.namedItem(name);
    if (!control.value) continue;
    const label = control.selectedOptions[0]?.textContent ?? control.value;
    const clear = element('button', `${label} ×`, 'filter-chip');
    clear.type = 'button';
    clear.setAttribute('aria-label', `Clear ${name} filter`);
    clear.addEventListener('click', () => {
      control.value = '';
      applyFilters(form);
      summary.focus();
    });
    chips.append(clear);
  }
  const count = chips.children.length;
  summary.textContent = count ? `Filters · ${count}` : 'Filters';
  chips.hidden = count === 0;
}

function renderFilters() {
  const params = new URLSearchParams(location.search);
  const usage = params.get('view') !== 'findings';
  const form = element('form', undefined, 'filter-bar');
  form.setAttribute('aria-label', usage ? 'Usage filters' : 'Finding filters');
  if (usage) form.classList.add('usage-filters');
  const primary = element('div', undefined, 'filter-main');
  if (!usage) primary.append(field(params, {
    name: 'query',
    label: 'Search findings',
    placeholder: 'Search findings, files, or descriptions…',
    className: 'search-field',
  }));
  primary.append(field(params, {
    name: 'repositoryId',
    label: 'Repository',
    options: dimensionFilterOptions(
      params,
      'repositoryId',
      dimensions?.repositories,
      'All repositories',
      'Selected repository',
    ),
  }));
  const skill = field(params, {
    name: 'skill',
    label: 'Skill',
    options: dimensionFilterOptions(params, 'skill', dimensions?.skills, 'All skills'),
  });
  if (usage) primary.append(skill);
  primary.append(field(params, {
    name: 'range',
    label: 'Time',
    options: [
      // Keep "all" explicit so a missing range can retain its faster default.
      { value: 'all', label: 'All time' },
      { value: '7', label: 'Last 7 days' },
      { value: '30', label: 'Last 30 days' },
      { value: '90', label: 'Last 90 days' },
    ],
  }));
  if (!usage) {
    const advanced = element('details', undefined, 'advanced-filters');
    const controls = element('div', undefined, 'advanced-filter-controls');
    controls.append(
      skill,
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
    advanced.append(element('summary', 'Filters'), controls);
    primary.append(advanced);
  }
  form.append(primary);
  if (!usage) form.append(element('div', undefined, 'active-filters'));
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
  form.querySelector('[name="query"]')?.addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => applyFilters(form), 250);
  });
  updateFilterSummary(form);
  filterHost.replaceChildren(form);
  filterHost.hidden = false;
  listenForFilterDimensions(form);
  return form;
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
    column.tabIndex = 0;
    column.setAttribute('role', 'img');
    column.setAttribute('aria-label', column.title);
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
  const description = element('dd');
  if (value instanceof Node) description.append(value);
  else description.textContent = String(value);
  item.append(element('dt', label), description);
  return item;
}

function sourceContext(evidence) {
  const context = element('section', undefined, 'source-context');
  const header = element('div', undefined, 'source-context-header');
  header.append(
    element('strong', evidence.path),
    element('span', evidence.language ?? 'Code'),
  );
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  const lines = evidence.content.split('\n');
  lines.forEach((content, index) => {
    const lineNumber = evidence.startLine + index;
    const line = element('span', undefined, 'source-line');
    if (lineNumber >= evidence.targetStartLine && lineNumber <= evidence.targetEndLine) {
      line.classList.add('source-line-target');
    }
    line.append(
      element('span', lineNumber, 'source-line-number'),
      element('span', content || ' ', 'source-line-content'),
    );
    code.append(line);
  });
  pre.append(code);
  context.append(header, pre);
  return context;
}

function findingPageSection(title) {
  const section = element('section', undefined, 'finding-page-section');
  section.append(element('h2', title));
  return section;
}

function githubLink(sourceUrl) {
  const sourceLink = link('Open on GitHub', sourceUrl, 'source-link text-link');
  sourceLink.target = '_blank';
  sourceLink.rel = 'noreferrer';
  return sourceLink;
}

function unavailableSourceContext(finding) {
  const context = element('div', undefined, 'source-context-empty');
  const location = findingLocation(finding);
  if (location !== '—') context.append(element('code', location));
  context.append(element('p', 'No source snippet was retained for this finding.'));
  return context;
}

function findingItem(finding) {
  const item = element('li');
  const button = element('button', undefined, 'finding-item');
  button.type = 'button';
  button.dataset.findingId = finding.id;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-controls', 'finding-inspector');
  const priority = element('span', undefined, 'finding-priority');
  priority.append(
    element('span', finding.severity, `severity ${finding.severity}`),
    element('span', finding.displayId, 'finding-display-id'),
  );
  const summary = element('span', undefined, 'finding-summary');
  summary.append(element('span', finding.title, 'finding-title'));
  const context = element('span', undefined, 'finding-context');
  context.append(
    element('span', finding.repository.fullName, 'finding-repository'),
    element('span', finding.skill, 'finding-skill'),
  );
  summary.append(context, element('span', findingLocation(finding), 'finding-location'));
  const observation = element('span', undefined, 'finding-observation');
  const observed = dateTime(finding.lastObservedAt, 'Not reported');
  if (finding.lastObservedAt) {
    const minutes = Math.round((new Date(finding.lastObservedAt).getTime() - Date.now()) / 60_000);
    const unit = Math.abs(minutes) < 60 ? 'minute' : Math.abs(minutes) < 1440 ? 'hour' : 'day';
    const amount = Math.round(minutes / (unit === 'minute' ? 1 : unit === 'hour' ? 60 : 1440));
    observed.textContent = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(amount, unit);
  }
  observation.append(
    element('span', findingOutcomeLabel(finding), `finding-status ${finding.outcome ?? ''}`),
    observed,
  );
  button.append(priority, summary, observation);
  button.addEventListener('click', () => inspectFinding(finding, button));
  item.append(button);
  return item;
}

function statusNavigation(params) {
  const navigation = element('nav', undefined, 'status-navigation');
  navigation.setAttribute('aria-label', 'Finding status shortcuts');
  const current = params.get('findingOutcome') ?? '';
  const statuses = [['', 'All findings'], ['posted', 'Posted'], ['resolved', 'Resolved'], ['rejected', 'Rejected']];
  if (current && !statuses.some(([value]) => value === current)) {
    statuses.push([current, current.charAt(0).toUpperCase() + current.slice(1)]);
  }
  for (const [value, label] of statuses) {
    const button = element('button', label, 'status-tab');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(current === value));
    button.addEventListener('click', () => {
      const form = filterHost.querySelector('form');
      form.elements.namedItem('findingOutcome').value = value;
      applyFilters(form);
    });
    navigation.append(button);
  }
  return navigation;
}

function findingsSection(data, params) {
  const section = element('section', undefined, 'findings-section');
  const toolbar = element('div', undefined, 'findings-toolbar');
  toolbar.append(statusNavigation(params), element('span', `${formatNumber(data.items.length)} on this page`, 'feed-count'));
  section.append(toolbar);
  if (!data.items.length) {
    const message = element('div', undefined, 'empty-findings');
    message.append(element('h2', 'Nothing matches these filters'), element('p', 'Try a wider date range or clear the finding filters.'));
    const clear = element('button', 'Clear finding filters', 'quiet-button');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      const form = filterHost.querySelector('form');
      for (const name of ['query', 'severity', 'skill', 'findingOutcome']) form.elements.namedItem(name).value = '';
      applyFilters(form);
    });
    message.append(clear);
    section.append(message);
    return section;
  }
  const workspace = element('div', undefined, 'review-workspace');
  const feed = element('div', undefined, 'review-feed');
  const heading = element('div', undefined, 'feed-heading');
  heading.append(element('h2', 'Latest Findings'), element('span', 'Newest runs first'));
  const list = element('ul', undefined, 'finding-list');
  list.setAttribute('aria-label', 'Findings');
  for (const finding of data.items) list.append(findingItem(finding));
  feed.append(heading, list);
  if (data.nextCursor) {
    const next = new URLSearchParams(params);
    next.set('cursor', data.nextCursor);
    const pagination = element('div', undefined, 'pagination');
    pagination.append(link('Next page', `/?${next}`, 'text-link'));
    feed.append(pagination);
  }
  const inspector = element('aside', undefined, 'finding-inspector');
  inspector.id = 'finding-inspector';
  inspector.hidden = true;
  inspector.setAttribute('aria-labelledby', 'inspector-title');
  workspace.append(feed, inspector);
  section.append(workspace);
  return section;
}

let inspectorVersion = 0;

async function inspectFinding(finding, trigger) {
  const version = ++inspectorVersion;
  const pageVersion = renderVersion;
  const workspace = content.querySelector('.review-workspace');
  const inspector = workspace.querySelector('.finding-inspector');
  for (const button of workspace.querySelectorAll('.finding-item')) {
    button.setAttribute('aria-pressed', String(button === trigger));
  }
  workspace.classList.add('has-inspector');
  inspector.hidden = false;
  const header = element('header', undefined, 'inspector-header');
  const actions = element('div', undefined, 'inspector-actions');
  const close = element('button', 'Close', 'quiet-button inspector-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close finding');
  const closeInspector = () => {
    ++inspectorVersion;
    inspector.hidden = true;
    workspace.classList.remove('has-inspector');
    trigger.setAttribute('aria-pressed', 'false');
    trigger.focus();
  };
  close.addEventListener('click', closeInspector);
  actions.append(
    element('span', finding.displayId, 'inspector-id'),
    link('Open full page', `/findings/${encodeURIComponent(finding.id)}${location.search}`),
    close,
  );
  const title = element('h2', finding.title);
  title.id = 'inspector-title';
  title.tabIndex = -1;
  header.append(actions, title, element('p', `${finding.repository.fullName} · ${finding.skill}`));
  const body = element('div', undefined, 'inspector-body');
  body.setAttribute('aria-live', 'polite');
  body.setAttribute('aria-busy', 'true');
  body.append(empty('Loading evidence…'));
  inspector.replaceChildren(header, body);
  inspector.onkeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeInspector();
    }
  };
  const narrowScreen = window.matchMedia('(max-width: 720px)').matches;
  if (!narrowScreen) trigger.scrollIntoView({ block: 'nearest' });
  title.focus({ preventScroll: !narrowScreen });
  try {
    const detail = await api(`/api/v1/findings/${encodeURIComponent(finding.id)}`);
    // Selection and navigation can both change while evidence is loading.
    if (version !== inspectorVersion || pageVersion !== renderVersion || !inspector.isConnected) return;
    body.replaceChildren(findingArticle(detail));
  } catch (error) {
    if (version !== inspectorVersion || pageVersion !== renderVersion || !inspector.isConnected) return;
    if (error.status === 401) {
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    const message = element('div', undefined, 'inspector-error');
    message.append(element('p', 'Could not load the evidence. Try again.'));
    const retry = element('button', 'Try again', 'quiet-button');
    retry.type = 'button';
    retry.addEventListener('click', () => inspectFinding(finding, trigger));
    message.append(retry);
    body.replaceChildren(message);
  } finally {
    if (version === inspectorVersion && inspector.isConnected) body.setAttribute('aria-busy', 'false');
  }
}

async function renderExplore(version) {
  const params = new URLSearchParams(location.search);
  const usage = params.get('view') !== 'findings';
  setPage(usage ? 'Usage' : 'Findings', usage
    ? 'The cost of keeping watch.'
    : 'Review findings and the evidence behind them.');
  filterHost.hidden = false;
  const filterForm = filterHost.querySelector('form') ?? renderFilters();
  const common = commonApiParams(params);
  if (usage) {
    const summary = await api(apiPath('/api/v1/dashboard/summary', common));
    if (version !== renderVersion) return;
    const breakdown = (dimension) => summary.breakdowns.find((item) => item.dimension === dimension) ?? { groups: [] };
    const totals = summary.totals;
    const section = document.createDocumentFragment();
    section.append(metrics([
      ['Known cost', formatCost(totals.costUsd)],
      ['Runs', formatNumber(totals.runs)],
      ['Findings', formatNumber(totals.findings)],
      ['Failed runs', formatNumber(totals.failed)],
    ]));
    const analytics = element('section', undefined, 'section');
    analytics.append(sectionHeader('Cost Breakdown', 'Reported and estimated usage'));
    const grid = element('div', undefined, 'analytics-grid');
    grid.append(
      dailyChart(breakdown('day')),
      barBreakdown('By repository', breakdown('repository'), 'repository'),
      barBreakdown('By skill', breakdown('skill'), 'skill'),
    );
    analytics.append(grid);
    section.append(analytics);
    content.replaceChildren(section);
    scheduleFilterDimensions(filterForm);
    return;
  }
  const findings = new URLSearchParams(common);
  for (const name of ['query', 'severity']) {
    const value = params.get(name);
    if (value) findings.set(name, value);
  }
  if (params.get('findingOutcome')) findings.set('outcome', params.get('findingOutcome'));
  if (params.get('cursor')) findings.set('cursor', params.get('cursor'));
  findings.set('limit', '30');
  const feed = await api(apiPath('/api/v1/findings', findings));
  if (version !== renderVersion) return;
  const section = findingsSection(feed, params);
  content.replaceChildren(section);
  scheduleFilterDimensions(filterForm);
}

async function renderFinding(version, findingId) {
  setPage('Finding', 'Loading finding details.');
  filterHost.replaceChildren();
  filterHost.hidden = true;
  const detail = await api(`/api/v1/findings/${encodeURIComponent(findingId)}`);
  const { finding } = detail;
  if (version !== renderVersion) return;
  setPage(finding.title, `${finding.displayId} · ${finding.repository.fullName} · ${finding.skill}`);

  const section = element('section', undefined, 'finding-page');
  const params = new URLSearchParams(location.search);
  params.set('view', 'findings');
  section.append(link('Back to findings', `/?${params}`));
  section.append(findingArticle(detail));
  content.replaceChildren(section);
}

function findingArticle(detail) {
  const { finding } = detail;
  const article = element('article', undefined, 'finding-page-card');
  const heading = element('div', undefined, 'finding-page-heading');
  heading.append(
    element('span', finding.severity, `severity ${finding.severity}`),
    element('span', findingOutcomeLabel(finding), `finding-status ${finding.outcome ?? ''}`),
  );

  const outcomeDescription = findingOutcomeDescription(finding);
  const reportingNote = outcomeDescription !== findingOutcomeLabel(finding)
    ? element('p', outcomeDescription, 'finding-reporting-note')
    : undefined;

  const explanation = findingPageSection('Why Warden Flagged This');
  explanation.append(element('p', finding.description, 'finding-page-description'));
  if (detail.verification) {
    const verification = element('div', undefined, 'finding-verification');
    verification.append(
      element('strong', 'Verification evidence'),
      element('p', detail.verification),
    );
    explanation.append(verification);
  }

  const codeContext = element('section', undefined, 'finding-page-section');
  const codeContextHeader = element('div', undefined, 'finding-page-section-header');
  codeContextHeader.append(element('h2', 'Code Context'));
  if (detail.sourceUrl) codeContextHeader.append(githubLink(detail.sourceUrl));
  codeContext.append(codeContextHeader, detail.sourceEvidence
    ? sourceContext(detail.sourceEvidence)
    : unavailableSourceContext(finding));

  const details = element('details', undefined, 'finding-page-section finding-metadata-disclosure');
  details.append(element('summary', 'Finding Details'));
  const metadata = element('dl', undefined, 'finding-page-metadata');
  metadata.append(
    findingDetail('ID', finding.displayId),
    findingDetail('Repository', finding.repository.fullName),
    findingDetail('Skill', finding.skill),
    findingDetail('Location', findingLocation(finding)),
    findingDetail('Confidence', finding.confidence ?? 'Not reported'),
    findingDetail('Primary model', finding.primaryModel ?? 'Not reported'),
    findingDetail('Latest outcome', findingOutcomeDescription(finding)),
    findingDetail('First observed', dateTime(finding.firstObservedAt)),
    findingDetail('Last observed', dateTime(finding.lastObservedAt)),
    findingDetail('Run completed', dateTime(finding.completedAt)),
    findingDetail('Run', finding.clientRunId),
    findingDetail('Commit', detail.headSha ? detail.headSha.slice(0, 12) : 'Not reported'),
  );
  details.append(metadata);
  article.append(heading);
  if (reportingNote) article.append(reportingNote);
  article.append(explanation, codeContext, details);
  return article;
}

async function render({ preserveContent = false } = {}) {
  const version = ++renderVersion;
  clearTimeout(filterTimer);
  const current = new URLSearchParams(location.search);
  const findingPath = location.pathname.match(/^\/findings\/([^/]+)\/?$/);
  const activeView = findingPath || current.get('view') === 'findings' ? 'findings' : 'usage';
  for (const view of ['findings', 'usage']) {
    const navigation = document.querySelector(`#nav-${view}`);
    const params = new URLSearchParams(current);
    params.delete('cursor');
    params.set('view', view);
    navigation.href = `/?${params}`;
    if (view === activeView) navigation.setAttribute('aria-current', 'page');
    else navigation.removeAttribute('aria-current');
  }
  content.setAttribute('aria-busy', 'true');
  if (!preserveContent) {
    const message = findingPath ? 'Loading finding…' : `Loading ${activeView}…`;
    const loading = element('div', message, 'page-loading');
    loading.setAttribute('role', 'status');
    content.replaceChildren(loading);
  }
  try {
    const findingId = findingPath ? decodeURIComponent(findingPath[1]) : undefined;
    if (!findingPath) ensureDefaultRange();
    // Data endpoints authenticate independently; account controls must not delay the feed.
    loadAccount();
    if (findingPath) await renderFinding(version, findingId);
    else await renderExplore(version);
  } catch (error) {
    if (version !== renderVersion) return;
    if (error instanceof Error && error.status === 401) {
      const returnTo = `${location.pathname}${location.search}`;
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    content.replaceChildren(element('div', error instanceof Error
      ? error.message
      : 'Could not load service data. Try again.', 'error'));
  } finally {
    if (version === renderVersion) content.setAttribute('aria-busy', 'false');
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
  const advanced = filterHost.querySelector('.advanced-filters[open]');
  if (advanced && !advanced.contains(target)) advanced.open = false;
  if (!accountMenu.contains(target)) setAccountMenuOpen(false);
  const anchor = target.closest('a');
  if (!anchor || anchor.origin !== location.origin || anchor.target || anchor.hash
    || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState({}, '', anchor.href);
  filterHost.replaceChildren();
  render();
});

document.addEventListener('keydown', (event) => {
  const advanced = filterHost.querySelector('.advanced-filters[open]');
  if (event.key === 'Escape' && advanced) {
    advanced.open = false;
    advanced.querySelector('summary').focus();
    return;
  }
  if (event.key !== 'Escape' || accountMenuPopover.hidden) return;
  setAccountMenuOpen(false);
  accountMenuTrigger.focus();
});

window.addEventListener('popstate', () => {
  filterHost.replaceChildren();
  render();
});
render();
