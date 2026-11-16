import { fetchAllCountries, fetchCountryByName } from './api';
import { renderCountryList } from './ui';
import { debounce } from './utils';

const searchInput = document.querySelector('#search-input') as HTMLInputElement;
const resultsContainer = document.querySelector('#results-container') as HTMLElement;