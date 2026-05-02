import { graphql, HttpResponse } from 'msw';
import type { Country, Continent, Language, StringFilter } from '../../src/services/CountriesService';

const ENDPOINT = 'https://countries.trevorblades.com/';
const link = graphql.link(ENDPOINT);

// ─── Mock fixtures ────────────────────────────────────────────────────────────

export const MOCK_COUNTRIES: Country[] = [
  {
    code: 'US', name: 'United States', capital: 'Washington D.C.',
    currency: 'USD', currencies: ['USD'], phone: '1', phones: ['1'],
    emoji: '🇺🇸', awsRegion: 'us-east-1',
    continent: { code: 'NA', name: 'North America' },
    languages: [{ code: 'en', name: 'English', native: 'English' }],
    states: [{ code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }],
  },
  {
    code: 'CA', name: 'Canada', capital: 'Ottawa',
    currency: 'CAD', currencies: ['CAD'], phone: '1', phones: ['1'],
    emoji: '🇨🇦', awsRegion: 'ca-central-1',
    continent: { code: 'NA', name: 'North America' },
    languages: [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'fr', name: 'French', native: 'Français' },
    ],
    states: [],
  },
  {
    code: 'DE', name: 'Germany', capital: 'Berlin',
    currency: 'EUR', currencies: ['EUR'], phone: '49', phones: ['49'],
    emoji: '🇩🇪', awsRegion: 'eu-central-1',
    continent: { code: 'EU', name: 'Europe' },
    languages: [{ code: 'de', name: 'German', native: 'Deutsch' }],
    states: [],
  },
  {
    code: 'FR', name: 'France', capital: 'Paris',
    currency: 'EUR', currencies: ['EUR'], phone: '33', phones: ['33'],
    emoji: '🇫🇷', awsRegion: 'eu-west-3',
    continent: { code: 'EU', name: 'Europe' },
    languages: [{ code: 'fr', name: 'French', native: 'Français' }],
    states: [],
  },
  // Multi-currency country — used for bonus currency consistency tests
  {
    code: 'CU', name: 'Cuba', capital: 'Havana',
    currency: 'CUC,CUP', currencies: ['CUC', 'CUP'], phone: '53', phones: ['53'],
    emoji: '🇨🇺', awsRegion: 'us-east-1',
    continent: { code: 'NA', name: 'North America' },
    languages: [{ code: 'es', name: 'Spanish', native: 'Español' }],
    states: [],
  },
  {
    code: 'JP', name: 'Japan', capital: 'Tokyo',
    currency: 'JPY', currencies: ['JPY'], phone: '81', phones: ['81'],
    emoji: '🇯🇵', awsRegion: 'ap-northeast-1',
    continent: { code: 'AS', name: 'Asia' },
    languages: [{ code: 'ja', name: 'Japanese', native: '日本語' }],
    states: [],
  },
];

export const MOCK_CONTINENTS: Continent[] = [
  { code: 'NA', name: 'North America', countries: [{ code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'CU', name: 'Cuba' }] },
  { code: 'EU', name: 'Europe', countries: [{ code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }] },
  { code: 'AS', name: 'Asia', countries: [{ code: 'JP', name: 'Japan' }] },
];

export const MOCK_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
];

// ─── Filter helpers ───────────────────────────────────────────────────────────

function matchesStringFilter(value: string | null | undefined, op: StringFilter): boolean {
  const v = value ?? '';
  if ('eq' in op)    return v === op.eq;
  if ('ne' in op)    return v !== op.ne;
  if ('in' in op)    return (op.in ?? []).includes(v);
  if ('nin' in op)   return !(op.nin ?? []).includes(v);
  if ('regex' in op) return new RegExp(op.regex!).test(v);
  return true;
}

function filterCountries(countries: Country[], filter: Record<string, StringFilter> | undefined): Country[] {
  if (!filter) return countries;
  return countries.filter(c => {
    if (filter['code']      && !matchesStringFilter(c.code, filter['code']))           return false;
    if (filter['currency']  && !matchesStringFilter(c.currency, filter['currency']))   return false;
    if (filter['continent'] && !matchesStringFilter(c.continent.code, filter['continent'])) return false;
    return true;
  });
}

function filterByCode<T extends { code: string }>(
  items: T[],
  filter: Record<string, StringFilter> | undefined,
): T[] {
  if (!filter?.['code']) return items;
  return items.filter(i => matchesStringFilter(i.code, filter['code']!));
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const countriesHandlers = [
  link.query('GetCountries', ({ variables }) => {
    const filtered = filterCountries(MOCK_COUNTRIES, variables?.filter as any);
    return HttpResponse.json({ data: { countries: filtered } });
  }),

  link.query('GetContinents', ({ variables }) => {
    const filtered = filterByCode(MOCK_CONTINENTS, variables?.filter as any);
    return HttpResponse.json({ data: { continents: filtered } });
  }),

  link.query('GetLanguages', ({ variables }) => {
    const filtered = filterByCode(MOCK_LANGUAGES, variables?.filter as any);
    return HttpResponse.json({ data: { languages: filtered } });
  }),
];
