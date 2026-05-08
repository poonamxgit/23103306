const apiClient = require('../logging_middleware/apiTestClient');
const logger = require('../logging_middleware/logger');

const DEPOT_API = 'http://4.224.186.213/evaluation-service/depots';
const VEHICLES_API = 'http://4.224.186.213/evaluation-service/vehicles';

function extractAuthHeaders(reqHeaders = {}) {
  const authHeaders = {};
  if (reqHeaders.authorization) authHeaders.authorization = reqHeaders.authorization;
  if (reqHeaders['x-api-key']) authHeaders['x-api-key'] = reqHeaders['x-api-key'];

  if (!authHeaders.authorization && process.env.UPSTREAM_AUTHORIZATION) {
    authHeaders.authorization = process.env.UPSTREAM_AUTHORIZATION;
  }

  if (!authHeaders['x-api-key'] && process.env.UPSTREAM_API_KEY) {
    authHeaders['x-api-key'] = process.env.UPSTREAM_API_KEY;
  }

  if (Object.keys(authHeaders).length === 0) {
    logger.warning('No auth headers supplied for upstream API request', {
      note: 'Protected evaluation API requires authentication. Set Authorization or x-api-key on the request, or configure UPSTREAM_AUTHORIZATION / UPSTREAM_API_KEY as env vars.'
    });
  }

  return authHeaders;
}

async function fetchDepots(headers = {}) {
  logger.info('Fetching depot data from upstream evaluation API', { url: DEPOT_API });
  const response = await apiClient.get(DEPOT_API, { headers });

  let body;
  try {
    body = JSON.parse(response.body);
  } catch (error) {
    logger.error('Unable to parse depot response body', error, { responseBody: response.body });
    throw new Error('Invalid depot response format');
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const message = body && (body.message || body.error) ? (body.message || body.error) : `Depot upstream error ${response.statusCode}`;
    const error = new Error(message);
    error.statusCode = response.statusCode;
    error.upstreamBody = body;
    throw error;
  }

  logger.debug('Depot API response parsed', { statusCode: response.statusCode, depotCount: Array.isArray(body.depots) ? body.depots.length : 0 });
  return Array.isArray(body.depots) ? body.depots : [];
}

async function fetchVehicles(headers = {}) {
  logger.info('Fetching vehicle tasks from upstream evaluation API', { url: VEHICLES_API });
  const response = await apiClient.get(VEHICLES_API, { headers });

  let body;
  try {
    body = JSON.parse(response.body);
  } catch (error) {
    logger.error('Unable to parse vehicles response body', error, { responseBody: response.body });
    throw new Error('Invalid vehicles response format');
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const message = body && (body.message || body.error) ? (body.message || body.error) : `Vehicles upstream error ${response.statusCode}`;
    const error = new Error(message);
    error.statusCode = response.statusCode;
    error.upstreamBody = body;
    throw error;
  }

  logger.debug('Vehicles API response parsed', { statusCode: response.statusCode, vehicleCount: Array.isArray(body.vehicles) ? body.vehicles.length : 0 });
  return Array.isArray(body.vehicles) ? body.vehicles : [];
}

function normalizeVehicleItem(vehicle) {
  const duration = Number(vehicle.Duration || vehicle.duration || 0);
  const impact = Number(vehicle.Impact || vehicle.impact || 0);
  return {
    taskId: vehicle.TaskID || vehicle.taskId || vehicle.ID || 'unknown',
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
    impact: Number.isFinite(impact) && impact > 0 ? Math.round(impact) : 0
  };
}

function greedySchedule(items, capacity) {
  logger.warning('Using greedy heuristic for scheduling due to large input size', { itemCount: items.length, capacity });

  const sorted = [...items].sort((a, b) => {
    const ratioA = a.impact / a.duration || 0;
    const ratioB = b.impact / b.duration || 0;
    if (ratioB !== ratioA) return ratioB - ratioA;
    return b.impact - a.impact;
  });

  const selected = [];
  let remaining = capacity;
  let totalImpact = 0;
  let totalDuration = 0;

  for (const item of sorted) {
    if (item.duration <= remaining) {
      selected.push(item);
      remaining -= item.duration;
      totalImpact += item.impact;
      totalDuration += item.duration;
    }
    if (remaining <= 0) break;
  }

  return { selected, totalImpact, totalDuration, usedCapacity: totalDuration };
}

function computeOptimalVehicleSchedule(rawVehicles, capacity) {
  if (!Array.isArray(rawVehicles)) {
    throw new Error('Vehicle list must be an array');
  }

  const items = rawVehicles
    .map(normalizeVehicleItem)
    .filter((item) => item.duration > 0 && item.impact > 0);

  logger.info('Preparing schedule optimization', { totalVehicles: items.length, capacity });

  if (capacity <= 0 || items.length === 0) {
    logger.warning('No capacity or no valid vehicle tasks available for scheduling', { capacity, validVehicles: items.length });
    return { selected: [], totalImpact: 0, totalDuration: 0, usedCapacity: 0 };
  }

  const predictedWork = items.length * capacity;
  if (predictedWork > 30_000_000) {
    return greedySchedule(items, capacity);
  }

  const dpImpact = new Array(capacity + 1).fill(0);
  const dpPrev = new Array(capacity + 1).fill(null);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    for (let w = capacity; w >= item.duration; w -= 1) {
      const candidateImpact = dpImpact[w - item.duration] + item.impact;
      if (candidateImpact > dpImpact[w]) {
        dpImpact[w] = candidateImpact;
        dpPrev[w] = { itemIndex: i, prevCapacity: w - item.duration };
      }
    }
  }

  let bestCapacity = 0;
  for (let w = 1; w <= capacity; w += 1) {
    if (dpImpact[w] > dpImpact[bestCapacity]) {
      bestCapacity = w;
    }
  }

  const selected = [];
  let cursor = bestCapacity;
  while (cursor > 0 && dpPrev[cursor]) {
    const { itemIndex, prevCapacity } = dpPrev[cursor];
    const item = items[itemIndex];
    if (!item) break;
    selected.push(item);
    cursor = prevCapacity;
  }

  const totalImpact = selected.reduce((sum, item) => sum + item.impact, 0);
  const totalDuration = selected.reduce((sum, item) => sum + item.duration, 0);

  logger.success('Computed optimal vehicle schedule', {
    selectedCount: selected.length,
    totalImpact,
    totalDuration,
    capacity
  });

  return { selected: selected.reverse(), totalImpact, totalDuration, usedCapacity: totalDuration };
}

module.exports = {
  extractAuthHeaders,
  fetchDepots,
  fetchVehicles,
  computeOptimalVehicleSchedule
};
