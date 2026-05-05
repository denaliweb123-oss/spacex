import { graphql, HttpResponse } from 'msw';
import { server } from '../mocks/msw.server';
import { countriesHandler, countriesHandlers, MOCK_COUNTRIES, MOCK_CONTINENTS, MOCK_LANGUAGES } from '../mocks/countries.handlers';
import { CountriesService } from '../../src/services/CountriesService';

// Register Countries API handlers before each test.
// The global afterEach in setup.ts calls server.resetHandlers() to clean up.
beforeEach(() => {
  server.use(...countriesHandlers);
});

const svc = new CountriesService();

// ─── getCountries ─────────────────────────────────────────────────────────────

describe('CountriesService — getCountries', () => {
  it('returns all countries when no filter is applied', async () => {
    const result = await svc.getCountries();
    expect(result).toHaveLength(MOCK_COUNTRIES.length);
  });

  it('each country has required scalar fields with correct types', async () => {
    const result = await svc.getCountries();
    for (const c of result) {
      expect(typeof c.code).toBe('string');
      expect(c.code.length).toBeGreaterThanOrEqual(2);
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(typeof c.emoji).toBe('string');
      expect(typeof c.awsRegion).toBe('string');
      expect(typeof c.phone).toBe('string');
    }
  });

  it('each country has a continent with code and name', async () => {
    const result = await svc.getCountries();
    for (const c of result) {
      expect(typeof c.continent.code).toBe('string');
      expect(c.continent.code.length).toBeGreaterThan(0);
      expect(typeof c.continent.name).toBe('string');
    }
  });

  it('each country has a languages array (may be empty)', async () => {
    const result = await svc.getCountries();
    for (const c of result) {
      expect(Array.isArray(c.languages)).toBe(true);
      for (const lang of c.languages) {
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
      }
    }
  });

  it('each country has a currencies array (may be empty)', async () => {
    const result = await svc.getCountries();
    for (const c of result) {
      expect(Array.isArray(c.currencies)).toBe(true);
    }
  });

  it('each country has a states array (may be empty)', async () => {
    const result = await svc.getCountries();
    for (const c of result) {
      expect(Array.isArray(c.states)).toBe(true);
    }
  });

  it('countries with states populate code and name on each state', async () => {
    const us = (await svc.getCountries()).find(c => c.code === 'US')!;
    expect(us.states.length).toBeGreaterThan(0);
    for (const s of us.states) {
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
    }
  });
});

// ─── getContinents ────────────────────────────────────────────────────────────

describe('CountriesService — getContinents', () => {
  it('returns all continents when no filter is applied', async () => {
    const result = await svc.getContinents();
    expect(result).toHaveLength(MOCK_CONTINENTS.length);
  });

  it('each continent has code, name, and a countries array', async () => {
    const result = await svc.getContinents();
    for (const cont of result) {
      expect(typeof cont.code).toBe('string');
      expect(typeof cont.name).toBe('string');
      expect(Array.isArray(cont.countries)).toBe(true);
    }
  });

  it('each nested country stub has code and name', async () => {
    const result = await svc.getContinents();
    for (const cont of result) {
      for (const c of cont.countries) {
        expect(typeof c.code).toBe('string');
        expect(typeof c.name).toBe('string');
      }
    }
  });
});

// ─── getLanguages ─────────────────────────────────────────────────────────────

describe('CountriesService — getLanguages', () => {
  it('returns all languages when no filter is applied', async () => {
    const result = await svc.getLanguages();
    expect(result).toHaveLength(MOCK_LANGUAGES.length);
  });

  it('each language has code, name, and native fields', async () => {
    const result = await svc.getLanguages();
    for (const lang of result) {
      expect(typeof lang.code).toBe('string');
      expect(typeof lang.name).toBe('string');
      expect(typeof lang.native).toBe('string');
    }
  });
});

// ─── Filter operators (bonus) ─────────────────────────────────────────────────

describe('CountriesService — filter operators', () => {
  it('eq: returns exactly the country matching the code', async () => {
    const result = await svc.getCountries({ code: { eq: 'US' } });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('US');
    expect(result[0].name).toBe('United States');
  });

  it('ne: excludes the specified country code', async () => {
    const result = await svc.getCountries({ code: { ne: 'US' } });
    expect(result.every(c => c.code !== 'US')).toBe(true);
    expect(result).toHaveLength(MOCK_COUNTRIES.length - 1);
  });

  it('in: returns only countries whose codes are in the set', async () => {
    const result = await svc.getCountries({ code: { in: ['US', 'CA'] } });
    expect(result).toHaveLength(2);
    const codes = result.map(c => c.code);
    expect(codes).toContain('US');
    expect(codes).toContain('CA');
  });

  it('nin: excludes countries whose codes are in the set', async () => {
    const result = await svc.getCountries({ code: { nin: ['DE', 'FR'] } });
    const codes = result.map(c => c.code);
    expect(codes).not.toContain('DE');
    expect(codes).not.toContain('FR');
    expect(result).toHaveLength(MOCK_COUNTRIES.length - 2);
  });

  it('regex: returns countries whose currency matches the pattern', async () => {
    // EUR matches DE and FR
    const result = await svc.getCountries({ currency: { regex: '^EUR$' } });
    expect(result).toHaveLength(2);
    expect(result.every(c => c.currency === 'EUR')).toBe(true);
  });

  it('continent in: returns only countries from specified continents', async () => {
    const result = await svc.getCountries({ continent: { in: ['EU'] } });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(c => c.continent.code === 'EU')).toBe(true);
  });

  it('continent nin: excludes countries from specified continents', async () => {
    const result = await svc.getCountries({ continent: { nin: ['EU'] } });
    expect(result.every(c => c.continent.code !== 'EU')).toBe(true);
  });

  it('continent filter on getContinents with eq returns the single matching continent', async () => {
    const result = await svc.getContinents({ code: { eq: 'NA' } });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('NA');
    expect(result[0].name).toBe('North America');
  });

  it('language filter with eq returns the single matching language', async () => {
    const result = await svc.getLanguages({ code: { eq: 'en' } });
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('en');
    expect(result[0].name).toBe('English');
  });

  it('empty in list returns no results', async () => {
    const result = await svc.getCountries({ code: { in: [] } });
    expect(result).toHaveLength(0);
  });
});

// ─── Currency consistency (bonus) ─────────────────────────────────────────────

describe('CountriesService — currency consistency', () => {
  it('single-currency country: currency string equals currencies[0]', async () => {
    const countries = await svc.getCountries();
    const singleCurrency = countries.filter(c => c.currencies.length === 1);
    expect(singleCurrency.length).toBeGreaterThan(0);
    for (const c of singleCurrency) {
      expect(c.currency).toBe(c.currencies[0]);
    }
  });

  it('multi-currency country: currency is a comma-separated string matching currencies array', async () => {
    const countries = await svc.getCountries();
    const multiCurrency = countries.filter(c => c.currencies.length > 1);
    expect(multiCurrency.length).toBeGreaterThan(0);
    for (const c of multiCurrency) {
      // currency field encodes multiple values as comma-joined string
      expect(c.currency).toBe(c.currencies.join(','));
    }
  });

  it('currency comma-split matches currencies array exactly for Cuba (CUC,CUP)', async () => {
    const [cuba] = await svc.getCountries({ code: { eq: 'CU' } });
    expect(cuba.currencies).toEqual(['CUC', 'CUP']);
    expect(cuba.currency).toBe('CUC,CUP');
    // Splitting the scalar field must produce the same ordered list as the array field
    expect(cuba.currency!.split(',')).toEqual(cuba.currencies);
  });

  it('all countries: currencies array length equals comma-segment count in currency string', async () => {
    const countries = await svc.getCountries();
    for (const c of countries) {
      if (c.currency == null) continue;
      const segmentCount = c.currency.split(',').length;
      expect(c.currencies).toHaveLength(segmentCount);
    }
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('CountriesService — error handling', () => {
  // withResolvers() returns the restore function directly (callable).
  // Throwing in a resolver causes GraphQL to return { errors: [...] },
  // which CountriesService maps to a thrown Error.
  it('throws when the API returns a GraphQL error', async () => {
    const revert = countriesHandler.withResolvers({
      Query: { countries: () => { throw new Error('internal server error'); } },
    } as Parameters<typeof countriesHandler.withResolvers>[0]);
    try {
      await expect(svc.getCountries()).rejects.toThrow('internal server error');
    } finally {
      (revert as unknown as () => void)();
    }
  });

  // withResolvers cannot produce a raw { data: null } payload (schema execution
  // always returns a data envelope). server.use() with a raw HTTP response is
  // the correct tool for testing this defensive path in CountriesService.gql().
  it('throws when the API returns null data', async () => {
    server.use(
      graphql.query('GetCountries', () =>
        HttpResponse.json({ data: null }),
      ),
    );
    await expect(svc.getCountries()).rejects.toThrow('No data in response');
  });
});
