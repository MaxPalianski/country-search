import type { Country, RawCountry } from './types';

function extractName(name: RawCountry['name']): string {
  if (typeof name === 'string' && name.trim().length > 0) {
    return name;
  }
  if (name && typeof name === 'object' && typeof name.common === 'string') {
    return name.common;
  }
  return 'Unknown';
}

function extractOfficialName(raw: RawCountry, fallback: string): string {
  if (
    typeof raw.officialName === 'string' &&
    raw.officialName.trim().length > 0
  ) {
    return raw.officialName;
  }
  if (
    raw.name &&
    typeof raw.name === 'object' &&
    typeof raw.name.official === 'string'
  ) {
    return raw.name.official;
  }
  return fallback;
}

function extractCapital(capital: RawCountry['capital']): string {
  if (typeof capital === 'string' && capital.trim().length > 0) {
    return capital;
  }
  if (Array.isArray(capital) && capital.length > 0) {
    return capital.join(', ');
  }
  return 'N/A';
}

function extractFlag(raw: RawCountry): string {
  if (raw.flags?.svg) return raw.flags.svg;
  if (raw.flags?.png) return raw.flags.png;
  if (typeof raw.flag === 'string' && raw.flag.startsWith('http')) {
    return raw.flag;
  }
  return '';
}

function extractLanguages(languages: RawCountry['languages']): string[] {
  if (!languages) return [];
  if (Array.isArray(languages)) {
    return languages
      .map((lang) => lang.name)
      .filter((name): name is string => Boolean(name));
  }
  return Object.values(languages).filter(Boolean);
}

function extractCurrencies(currencies: RawCountry['currencies']): string[] {
  if (!currencies) return [];
  if (Array.isArray(currencies)) {
    return currencies
      .map((curr) => {
        if (!curr.name) return curr.code ?? '';
        return curr.symbol ? `${curr.name} (${curr.symbol})` : curr.name;
      })
      .filter(Boolean);
  }
  return Object.entries(currencies).map(([code, info]) => {
    const label = info.name ?? code;
    return info.symbol ? `${label} (${info.symbol})` : label;
  });
}

export function mapCountryResponse(raw: RawCountry): Country {
  const name = extractName(raw.name);

  return {
    name,
    officialName: extractOfficialName(raw, name),
    flag: extractFlag(raw),
    capital: extractCapital(raw.capital),
    region: raw.region && raw.region.trim().length > 0 ? raw.region : 'Unknown',
    population: typeof raw.population === 'number' ? raw.population : 0,
    languages: extractLanguages(raw.languages),
    currencies: extractCurrencies(raw.currencies),
    area: typeof raw.area === 'number' ? raw.area : null,
    borders: Array.isArray(raw.borders) ? raw.borders : [],
    description: typeof raw.description === 'string' ? raw.description : '',
  };
}
