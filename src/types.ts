export interface RawLanguage {
  name?: string;
  iso639_1?: string;
  iso639_2?: string;
}

export interface RawCurrency {
  code?: string;
  name?: string;
  symbol?: string;
}

export interface RawCountry {
  name?: string | { common?: string; official?: string };
  officialName?: string;
  capital?: string | string[];
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  flag?: string;
  flags?: { svg?: string; png?: string; alt?: string };
  languages?: RawLanguage[] | Record<string, string>;
  currencies?:
    RawCurrency[] | Record<string, { name?: string; symbol?: string }>;
  description?: string;
}

export interface Country {
  name: string;
  officialName: string;
  flag: string;
  capital: string;
  region: string;
  population: number;
  languages: string[];
  currencies: string[];
  area: number | null;
  borders: string[];
  description: string;
}
