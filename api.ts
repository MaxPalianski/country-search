import { Country } from './types';

const BASE_URL = 'https://restcountries.com/v3.1';

export async function fetchAllCountries(): Promise<Country[]> {
  const response = await fetch(`${BASE_URL}/all?fields=name,capital,population,flags,region`);
  if (!response.ok) throw new Error('Failed to fetch countries');
  return response.json();
}

export async function fetchCountryByName(name: string): Promise<Country[]> {
  const response = await fetch(`${BASE_URL}/name/${name}`);
  if (!response.ok) throw new Error('Country not found');
  return response.json();
}