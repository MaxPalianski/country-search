import { describe, it, expect } from 'vitest';
import { mapCountryResponse } from './mapper';
import type { RawCountry } from './types';

describe('mapCountryResponse', () => {
  it('maps a standard countries.dev country object into a clean Country model', () => {
    const raw: RawCountry = {
      name: 'Spain',
      officialName: 'Kingdom of Spain',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      flags: {
        svg: 'https://flagcdn.com/es.svg',
        png: 'https://flagcdn.com/w320/es.png',
      },
      languages: [{ name: 'Spanish', iso639_1: 'es' }],
      currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
      description: 'Country in Southwestern Europe.',
    };

    const result = mapCountryResponse(raw);

    expect(result).toEqual({
      name: 'Spain',
      officialName: 'Kingdom of Spain',
      flag: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
      currencies: ['Euro (€)'],
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      description: 'Country in Southwestern Europe.',
    });
  });

  it('handles missing optional fields gracefully with safe defaults', () => {
    const raw: RawCountry = {
      name: 'Antarctica',
    };

    const result = mapCountryResponse(raw);

    expect(result).toEqual({
      name: 'Antarctica',
      officialName: 'Antarctica',
      flag: '',
      capital: 'N/A',
      region: 'Unknown',
      population: 0,
      languages: [],
      currencies: [],
      area: null,
      borders: [],
      description: '',
    });
  });
});
