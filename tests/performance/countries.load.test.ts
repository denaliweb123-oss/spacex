import { server } from '../mocks/msw.server';
import { countriesHandlers, MOCK_COUNTRIES } from '../mocks/countries.handlers';
import { CountriesService } from '../../src/services/CountriesService';
import { graphql, HttpResponse } from 'msw';

// Register Countries API handlers before each test.
beforeEach(() => {
  server.use(...countriesHandlers);
});

const svc = new CountriesService();

// ─── Latency: full countries query with nested fields (bonus) ─────────────────

describe('CountriesService — latency', () => {
  it('resolves getCountries with all nested fields in under 500 ms', async () => {
    const start = Date.now();
    const result = await svc.getCountries();
    const duration = Date.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(500);
  });

  it('resolves getCountries with a large dataset (250 countries) in under 1000 ms', async () => {
    const LARGE_DATASET = Array.from({ length: 250 }, (_, i) => ({
      ...MOCK_COUNTRIES[i % MOCK_COUNTRIES.length],
      code: `C${String(i).padStart(3, '0')}`,
      name: `Country ${i}`,
    }));

    const link = graphql.link('https://countries.trevorblades.com/');
    server.use(
      link.query('GetCountries', () =>
        HttpResponse.json({ data: { countries: LARGE_DATASET } }),
      ),
    );

    const start = Date.now();
    const result = await svc.getCountries();
    const duration = Date.now() - start;

    expect(result).toHaveLength(250);
    expect(duration).toBeLessThan(1000);
  });

  it('resolves 10 concurrent getCountries calls within 2000 ms', async () => {
    const start = Date.now();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => svc.getCountries()),
    );
    const duration = Date.now() - start;

    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r.length).toBe(MOCK_COUNTRIES.length);
    }
    expect(duration).toBeLessThan(2000);
  });

  it('resolves concurrent filtered queries (getContinents + getLanguages + getCountries) within 1500 ms', async () => {
    const start = Date.now();
    const [countries, continents, languages] = await Promise.all([
      svc.getCountries({ continent: { eq: 'NA' } }),
      svc.getContinents({ code: { eq: 'NA' } }),
      svc.getLanguages({ code: { eq: 'en' } }),
    ]);
    const duration = Date.now() - start;

    expect(countries.every(c => c.continent.code === 'NA')).toBe(true);
    expect(continents[0].code).toBe('NA');
    expect(languages[0].code).toBe('en');
    expect(duration).toBeLessThan(1500);
  });
});
