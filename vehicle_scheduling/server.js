const express = require('express');
const { createLoggingMiddleware, errorLoggingMiddleware } = require('../logging_middleware/loggingMiddleware');
const logger = require('../logging_middleware/logger');
const {
  extractAuthHeaders,
  fetchDepots,
  fetchVehicles,
  computeOptimalVehicleSchedule
} = require('./scheduler');

const app = express();
app.use(express.json());

app.use(createLoggingMiddleware({
  enableRequestBody: true,
  enableResponseBody: false,
  maxBodySize: 2000
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'vehicle-scheduling', timestamp: new Date().toISOString() });
});

app.get('/depots', async (req, res, next) => {
  try {
    const authHeaders = extractAuthHeaders(req.headers);
    const depots = await fetchDepots(authHeaders);
    res.json({ depots });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

app.get('/vehicles', async (req, res, next) => {
  try {
    const authHeaders = extractAuthHeaders(req.headers);
    const vehicles = await fetchVehicles(authHeaders);
    res.json({ vehicles });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

app.get('/schedule', async (req, res, next) => {
  try {
    const depotId = Number(req.query.depotId || 1);
    const authHeaders = extractAuthHeaders(req.headers);

    if (!authHeaders.authorization && !authHeaders['x-api-key']) {
      return res.status(401).json({
        error: 'Missing upstream authorization. Provide Authorization or x-api-key in the request or set UPSTREAM_AUTHORIZATION / UPSTREAM_API_KEY before starting the service.'
      });
    }

    const depots = await fetchDepots(authHeaders);
    const vehicles = await fetchVehicles(authHeaders);

    if (!Array.isArray(depots) || depots.length === 0) {
      const message = 'No depots available from upstream API';
      logger.warning(message);
      return res.status(502).json({ error: message });
    }

    const depot = depots.find((item) => Number(item.ID) === depotId) || depots[0];
    if (!depot) {
      const message = `Depot with ID ${depotId} not found`;
      logger.warning(message, { depotId });
      return res.status(404).json({ error: message });
    }

    const capacity = Number(depot.MechanicHours || depot.mechanicHours || 0);
    if (capacity <= 0) {
      logger.warning('Depot has no available mechanic hours', { depotId, capacity });
      return res.status(400).json({ error: 'Depot has no available mechanic hours' });
    }

    const schedule = computeOptimalVehicleSchedule(vehicles, capacity);

    res.json({
      depot: {
        id: depot.ID,
        mechanicHours: capacity
      },
      schedule: {
        totalImpact: schedule.totalImpact,
        totalDuration: schedule.totalDuration,
        selectedCount: schedule.selected.length,
        selectedTasks: schedule.selected
      },
      candidateCount: vehicles.length
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
});

app.use(errorLoggingMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.success('Vehicle scheduling service started', { port: PORT });
  logger.info('Ready to serve scheduling requests', {
    endpoints: ['/health', '/depots', '/vehicles', '/schedule?depotId=1']
  });
});

module.exports = app;
