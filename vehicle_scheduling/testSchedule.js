const apiClient = require('../logging_middleware/apiTestClient');

const SERVICE_URL = process.env.SCHEDULER_URL || 'http://localhost:4000';
const DEPOT_ID = process.env.DEPOT_ID || '1';
const AUTHORIZATION = process.env.AUTHORIZATION;
const API_KEY = process.env.API_KEY;

function buildAuthHeaders() {
  const headers = {};
  if (AUTHORIZATION) headers.authorization = AUTHORIZATION;
  if (API_KEY) headers['x-api-key'] = API_KEY;
  return headers;
}

async function runScheduleTest() {
  try {
    console.log(`Requesting schedule from ${SERVICE_URL}/schedule?depotId=${DEPOT_ID}`);

    const response = await apiClient.get(`${SERVICE_URL}/schedule`, {
      query: { depotId: DEPOT_ID },
      headers: buildAuthHeaders(),
      timeout: 10000
    });

    console.log('Status:', response.statusCode);
    console.log('Duration:', `${response.duration}ms`);

    try {
      const json = JSON.parse(response.body);
      console.log('Schedule response:', JSON.stringify(json, null, 2));
    } catch (parseError) {
      console.error('Failed to parse response body:', parseError.message);
      console.error('Raw body:', response.body);
    }
  } catch (error) {
    console.error('Schedule test failed:', error.message || error);
    process.exit(1);
  }
}

runScheduleTest();
