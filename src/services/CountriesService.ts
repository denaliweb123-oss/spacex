const ENDPOINT = 'https://countries.trevorblades.com/';

export interface StringFilter {
  eq?: string;
  ne?: string;
  in?: string[];
  nin?: string[];
  regex?: string;
}

export interface CountryFilter {
  code?: StringFilter;
  currency?: StringFilter;
  continent?: StringFilter;
}

export interface Country {
  code: string;
  name: string;
  capital: string | null;
  currency: string | null;
  currencies: string[];
  phone: string;
  phones: string[];
  emoji: string;
  awsRegion: string;
  continent: { code: string; name: string };
  languages: { code: string; name: string; native: string }[];
  states: { code: string | null; name: string }[];
}

export interface Continent {
  code: string;
  name: string;
  countries: { code: string; name: string }[];
}

export interface Language {
  code: string;
  name: string;
  native: string;
}

export class CountriesService {
  constructor(private readonly endpoint = ENDPOINT) {}

  private async gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(json.errors[0].message);
    if (json.data == null) throw new Error('No data in response');
    return json.data;
  }

  async getCountries(filter?: CountryFilter): Promise<Country[]> {
    const { countries } = await this.gql<{ countries: Country[] }>(
      `query GetCountries($filter: CountryFilterInput) {
        countries(filter: $filter) {
          code name capital currency currencies phone phones emoji awsRegion
          continent { code name }
          languages { code name native }
          states { code name }
        }
      }`,
      filter ? { filter } : undefined,
    );
    return countries;
  }

  async getContinents(filter?: { code?: StringFilter }): Promise<Continent[]> {
    const { continents } = await this.gql<{ continents: Continent[] }>(
      `query GetContinents($filter: ContinentFilterInput) {
        continents(filter: $filter) { code name countries { code name } }
      }`,
      filter ? { filter } : undefined,
    );
    return continents;
  }

  async getLanguages(filter?: { code?: StringFilter }): Promise<Language[]> {
    const { languages } = await this.gql<{ languages: Language[] }>(
      `query GetLanguages($filter: LanguageFilterInput) {
        languages(filter: $filter) { code name native }
      }`,
      filter ? { filter } : undefined,
    );
    return languages;
  }
}
