import { http, HttpResponse } from 'msw';
import RAW_LAUNCHES from '../fixtures/launches.json';

const BASE = 'https://api.spacexdata.com';

// ─── v5 launch endpoints (specific paths before :id) ─────────────────────────

const v5LaunchHandlers = [
  http.get(`${BASE}/v5/launches/past`, () => HttpResponse.json(RAW_LAUNCHES)),
  http.get(`${BASE}/v5/launches/latest`, () => HttpResponse.json(RAW_LAUNCHES[0])),
  http.get(`${BASE}/v5/launches/upcoming`, () => HttpResponse.json([])),
  http.get(`${BASE}/v5/launches/next`, () => HttpResponse.json(RAW_LAUNCHES[0])),
  http.get(`${BASE}/v5/launches/:id`, ({ params }) => {
    const launch = RAW_LAUNCHES.find((l: { id: string }) => l.id === params['id']);
    return launch
      ? HttpResponse.json(launch)
      : HttpResponse.json(null, { status: 404 });
  }),
  http.post(`${BASE}/v5/launches/query`, () => HttpResponse.json(RAW_LAUNCHES)),
];

// ─── v4 collection endpoints ──────────────────────────────────────────────────

const v4Handlers = [
  http.get(`${BASE}/v4/launches`, () => HttpResponse.json(RAW_LAUNCHES)),
  http.post(`${BASE}/v4/launches/query`, () => HttpResponse.json(RAW_LAUNCHES)),

  http.get(`${BASE}/v4/rockets`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/rockets/:id`, () => HttpResponse.json(null, { status: 404 })),
  http.post(`${BASE}/v4/rockets/query`, () => HttpResponse.json([])),

  http.get(`${BASE}/v4/capsules`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/capsules/:id`, () => HttpResponse.json(null, { status: 404 })),

  http.get(`${BASE}/v4/company`, () => HttpResponse.json({})),

  http.get(`${BASE}/v4/cores`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/cores/:id`, () => HttpResponse.json(null, { status: 404 })),

  http.get(`${BASE}/v4/dragons`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/dragons/:id`, () => HttpResponse.json(null, { status: 404 })),

  http.get(`${BASE}/v4/history`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/history/:id`, () => HttpResponse.json(null, { status: 404 })),
  http.post(`${BASE}/v4/history/query`, () => HttpResponse.json([])),

  http.get(`${BASE}/v4/landpads`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/landpads/:id`, () => HttpResponse.json(null, { status: 404 })),

  http.get(`${BASE}/v4/launchpads`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/launchpads/:id`, () => HttpResponse.json(null, { status: 404 })),

  http.get(`${BASE}/v4/payloads`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/payloads/:id`, () => HttpResponse.json(null, { status: 404 })),
  http.post(`${BASE}/v4/payloads/query`, () => HttpResponse.json([])),

  http.get(`${BASE}/v4/ships`, () => HttpResponse.json([])),
  http.get(`${BASE}/v4/ships/:id`, () => HttpResponse.json(null, { status: 404 })),
  http.post(`${BASE}/v4/ships/query`, () => HttpResponse.json([])),

  http.get(`${BASE}/v4/roadster`, () => HttpResponse.json({})),
];

export const handlers = [...v5LaunchHandlers, ...v4Handlers];
