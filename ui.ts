import { Country } from './types';

export function renderCountryList(countries: Country[], container: HTMLElement): void {
  container.innerHTML = countries
    .map(
      (country) => `
    <div class="country-card" data-name="${country.name.common}">
      <img src="${country.flags.svg}" alt="${country.flags.alt || 'Flag'}" width="100">
      <h3>${country.name.common}</h3>
      <p>Capital: ${country.capital?.[0] || 'N/A'}</p>
    </div>
  `
    )
    .join('');
}