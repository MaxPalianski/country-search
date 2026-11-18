import '../style.css';
import { createSearchController } from './searchController';
import { loadSearchHistory, saveSearchQuery } from './storage';
import { initAppUI } from './ui';

let history = loadSearchHistory();

const ui = initAppUI({
  onInput: (value) => {
    controller.handleInput(value);
  },
  onRetry: () => {
    void controller.retry();
  },
  onHistorySelect: (query) => {
    ui.setInputValue(query);
    void controller.searchNow(query);
  },
});

const controller = createSearchController((state) => {
  ui.renderState(state);
  if (state.status === 'success' && state.query) {
    history = saveSearchQuery(state.query);
    ui.renderHistory(history);
  }
});

ui.renderHistory(history);
ui.renderState(controller.getState());
