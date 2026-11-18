import type { Country, SearchState } from './types';

export interface UIHandlers {
  onInput: (value: string) => void;
  onRetry: () => void;
  onHistorySelect: (query: string) => void;
}

export interface AppUI {
  renderState: (state: SearchState) => void;
  renderHistory: (items: string[]) => void;
  setInputValue: (value: string) => void;
}

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function initAppUI(handlers: UIHandlers): AppUI {
  const app = createEl('main', 'app');

  const header = createEl('header', 'header');
  const title = createEl('h1', 'title', 'Country Search');
  const subtitle = createEl(
    'p',
    'subtitle',
    'Instant live search powered by countries.dev with AbortController cancellation',
  );
  header.append(title, subtitle);

  const searchBox = createEl('div', 'search-box');
  const input = createEl('input', 'search-input');
  input.type = 'search';
  input.placeholder = 'Type a country name (e.g. Spain, Japan, Brazil)...';
  input.setAttribute('aria-label', 'Search countries by name');

  const clearBtn = createEl('button', 'clear-btn', 'Clear');
  clearBtn.type = 'button';

  searchBox.append(input, clearBtn);

  const historySection = createEl('section', 'history-section');
  const historyLabel = createEl('span', 'history-label', 'Recent:');
  const historyList = createEl('div', 'history-list');
  historySection.append(historyLabel, historyList);
  historySection.hidden = true;

  const statusContainer = createEl('section', 'status-container');
  statusContainer.setAttribute('aria-live', 'polite');

  const resultsGrid = createEl('section', 'results-grid');

  // Detail modal
  const modalOverlay = createEl('div', 'modal-overlay');
  modalOverlay.hidden = true;
  const modalCard = createEl('article', 'modal-card');
  modalCard.setAttribute('role', 'dialog');
  modalCard.setAttribute('aria-modal', 'true');
  modalOverlay.append(modalCard);

  const closeModal = (): void => {
    modalOverlay.hidden = true;
  };

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) {
      closeModal();
    }
  });

  const openCountryDetails = (country: Country): void => {
    const closeBtn = createEl('button', 'modal-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close details');
    closeBtn.addEventListener('click', closeModal);

    const headerRow = createEl('div', 'modal-header');
    if (country.flag) {
      const flagImg = createEl('img', 'modal-flag');
      flagImg.src = country.flag;
      flagImg.alt = `Flag of ${country.name}`;
      headerRow.append(flagImg);
    }

    const headingGroup = createEl('div', 'modal-heading');
    const nameEl = createEl('h2', 'modal-title', country.name);
    const officialEl = createEl('p', 'modal-official', country.officialName);
    headingGroup.append(nameEl, officialEl);
    headerRow.append(headingGroup);

    const detailsList = createEl('dl', 'details-list');

    const addDetail = (label: string, value: string): void => {
      const row = createEl('div', 'detail-row');
      const dt = createEl('dt', 'detail-term', label);
      const dd = createEl('dd', 'detail-desc', value);
      row.append(dt, dd);
      detailsList.append(row);
    };

    addDetail('Capital', country.capital);
    addDetail('Region', country.region);
    addDetail('Population', formatNumber(country.population));
    addDetail(
      'Area',
      country.area !== null ? `${formatNumber(country.area)} km²` : 'N/A',
    );
    addDetail(
      'Languages',
      country.languages.length > 0 ? country.languages.join(', ') : 'N/A',
    );
    addDetail(
      'Currencies',
      country.currencies.length > 0 ? country.currencies.join(', ') : 'N/A',
    );
    addDetail(
      'Borders',
      country.borders.length > 0 ? country.borders.join(', ') : 'None',
    );

    const nodes: HTMLElement[] = [closeBtn, headerRow];
    if (country.description) {
      nodes.push(createEl('p', 'modal-description', country.description));
    }
    nodes.push(detailsList);

    modalCard.replaceChildren(...nodes);
    modalOverlay.hidden = false;
  };

  const createCountryCard = (country: Country): HTMLElement => {
    const card = createEl('article', 'country-card');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View details for ${country.name}`);

    const flagWrapper = createEl('div', 'card-flag-wrap');
    if (country.flag) {
      const img = createEl('img', 'card-flag');
      img.src = country.flag;
      img.alt = `Flag of ${country.name}`;
      img.loading = 'lazy';
      flagWrapper.append(img);
    } else {
      flagWrapper.append(createEl('span', 'flag-placeholder', 'No flag'));
    }

    const body = createEl('div', 'card-body');
    const nameEl = createEl('h2', 'card-title', country.name);
    const capitalEl = createEl('p', 'card-meta', `Capital: ${country.capital}`);
    const regionEl = createEl('p', 'card-meta', `Region: ${country.region}`);
    const popEl = createEl(
      'p',
      'card-meta',
      `Population: ${formatNumber(country.population)}`,
    );

    body.append(nameEl, capitalEl, regionEl, popEl);
    card.append(flagWrapper, body);

    const handleOpen = (): void => openCountryDetails(country);
    card.addEventListener('click', handleOpen);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    });

    return card;
  };

  input.addEventListener('input', () => {
    handlers.onInput(input.value);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.focus();
    handlers.onInput('');
  });

  app.append(header, searchBox, historySection, statusContainer, resultsGrid);
  document.body.prepend(app, modalOverlay);

  const renderState = (state: SearchState): void => {
    statusContainer.replaceChildren();
    resultsGrid.replaceChildren();

    if (state.status === 'idle') {
      const hint = createEl(
        'p',
        'state-message state-idle',
        'Start typing a country name above to search.',
      );
      statusContainer.append(hint);
      return;
    }

    if (state.status === 'loading') {
      const loaderWrap = createEl('div', 'state-message state-loading');
      const spinner = createEl('span', 'spinner');
      const text = createEl(
        'span',
        undefined,
        `Searching for "${state.query}"...`,
      );
      loaderWrap.append(spinner, text);
      statusContainer.append(loaderWrap);
      return;
    }

    if (state.status === 'empty') {
      const emptyBox = createEl('div', 'state-message state-empty');
      const heading = createEl(
        'p',
        'empty-title',
        `No countries found matching "${state.query}".`,
      );
      const tip = createEl(
        'p',
        'empty-tip',
        'Try checking the spelling or searching for a broader name.',
      );
      emptyBox.append(heading, tip);
      statusContainer.append(emptyBox);
      return;
    }

    if (state.status === 'error') {
      const errorBox = createEl('div', 'state-message state-error');
      const msg = createEl(
        'p',
        'error-text',
        state.errorMessage ?? 'Something went wrong while fetching countries.',
      );
      const retryBtn = createEl('button', 'retry-btn', 'Retry');
      retryBtn.type = 'button';
      retryBtn.addEventListener('click', handlers.onRetry);
      errorBox.append(msg, retryBtn);
      statusContainer.append(errorBox);
      return;
    }

    const cards = state.results.map(createCountryCard);
    resultsGrid.append(...cards);
  };

  const renderHistory = (items: string[]): void => {
    historyList.replaceChildren();
    if (items.length === 0) {
      historySection.hidden = true;
      return;
    }

    historySection.hidden = false;
    for (const item of items) {
      const chip = createEl('button', 'history-chip', item);
      chip.type = 'button';
      chip.addEventListener('click', () => handlers.onHistorySelect(item));
      historyList.append(chip);
    }
  };

  const setInputValue = (value: string): void => {
    input.value = value;
  };

  return {
    renderState,
    renderHistory,
    setInputValue,
  };
}
