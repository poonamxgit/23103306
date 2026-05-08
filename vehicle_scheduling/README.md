# Vehicle Maintenance Scheduler Microservice

This service is designed to fetch depot and vehicle task data from the provided evaluation APIs and compute an optimal maintenance schedule for a depot within its available mechanic-hours.

## Features

- Uses the shared logging middleware from `logging_middleware` for request and response tracing.
- Fetches depot and vehicle data from the evaluation APIs.
- Computes a near-optimal task schedule that maximizes total impact while respecting mechanic hour limits.
- Supports authenticated upstream requests by forwarding `Authorization` or `x-api-key` headers.

## Endpoints

- `GET /health`
  - Returns service health status.

- `GET /depots`
  - Fetches depot data from the upstream evaluation API.

- `GET /vehicles`
  - Fetches vehicle task data from the upstream evaluation API.

- `GET /schedule?depotId=1`
  - Returns the best task schedule for the specified depot.
  - If `depotId` is omitted, the service uses the first depot in the returned list.

## Usage

```bash
cd vehicle_scheduling
npm install
npm start
```

Then open `http://localhost:4000/schedule?depotId=1`.

## Quick test

First make sure the service is running in the `vehicle_scheduling` folder:

```bash
cd vehicle_scheduling
npm install
npm start
```

Open a second terminal and run:

```bash
cd vehicle_scheduling
npm run test:schedule
```

If you see `ECONNREFUSED`, the scheduler service is not running on `http://localhost:4000`.

To point at a different host or depot:

```bash
SCHEDULER_URL=http://localhost:4000 DEPOT_ID=1 npm run test:schedule
```

If the upstream evaluation API is protected, include headers:

```bash
SCHEDULER_URL=http://localhost:4000 DEPOT_ID=1 AUTHORIZATION='Bearer <token>' npm run test:schedule
```

or:

```bash
SCHEDULER_URL=http://localhost:4000 DEPOT_ID=1 API_KEY='<key>' npm run test:schedule
```

You can also configure the service to forward auth automatically from environment variables before starting it:

```bash
cd vehicle_scheduling
UPSTREAM_AUTHORIZATION='Bearer <token>' npm start
```

or:

```bash
cd vehicle_scheduling
UPSTREAM_API_KEY='<key>' npm start
```

Then use the browser, `curl`, or `npm run test:schedule` without passing headers to `/schedule`.

If no auth is supplied, `/schedule` now returns a clear 401 response telling you to provide `Authorization` or `x-api-key`.

## Curl examples

Fetch the schedule directly from the running service:

```bash
curl -sS "http://localhost:4000/schedule?depotId=1"
```

Save the response to a file for review:

```bash
curl -sS "http://localhost:4000/schedule?depotId=1" -o schedule-response.json
```

With authorization headers:

```bash
curl -sS \
  -H "Authorization: Bearer <token>" \
  "http://localhost:4000/schedule?depotId=1"
```

```bash
curl -sS \
  -H "x-api-key: <key>" \
  "http://localhost:4000/schedule?depotId=1"
```

## Credentials note

The upstream depot and vehicle APIs are protected. If you do not have the evaluation platform credentials,
this service will be unable to fetch real data. In that case, the implementation is still complete,
but actual endpoint verification is blocked by missing credentials.

Add the provider-issued `accessCode`, `clientID`, and `clientSecret` or the returned auth token before running the scheduler.

## Logging

All API calls and scheduling decisions are logged through the shared middleware and logger in `../logging_middleware`.
