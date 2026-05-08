/**
 * Example Usage: Logging Middleware and API Test Client
 * Demonstrates how to use the comprehensive logging system
 */

const express = require('express');
const { createLoggingMiddleware, errorLoggingMiddleware } = require('./loggingMiddleware');
const apiClient = require('./apiTestClient');
const logger = require('./logger');

// Initialize Express app
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Apply logging middleware with configuration
app.use(createLoggingMiddleware({
  enableRequestBody: true,
  enableResponseBody: true,
  maxBodySize: 1000
}));

// ============================================
// EXAMPLE ROUTES DEMONSTRATING LOGGING
// ============================================

/**
 * GET /api/status
 * Simple endpoint returning status
 */
app.get('/api/status', (req, res) => {
  logger.info('Status endpoint accessed', { route: '/api/status' });
  res.json({ status: 'Server is running', timestamp: new Date() });
});

/**
 * POST /api/test
 * Endpoint that demonstrates request body logging
 */
app.post('/api/test', (req, res) => {
  const { name, email } = req.body;

  logger.info('Test endpoint processing data', {
    route: '/api/test',
    fieldsReceived: ['name', 'email']
  });

  if (!name || !email) {
    logger.warning('Missing required fields', {
      providedFields: Object.keys(req.body)
    });
    return res.status(400).json({ error: 'Name and email are required' });
  }

  logger.success('Data processed successfully', {
    name,
    emailLength: email.length
  });

  res.json({ message: 'Data received successfully', data: { name, email } });
});

/**
 * GET /api/test-external
 * Endpoint that makes external API calls
 */
app.get('/api/test-external', async (req, res) => {
  try {
    logger.info('Starting external API test', { route: '/api/test-external' });

    // Example 1: GET request to test server
    const response1 = await apiClient.get('https://jsonplaceholder.typicode.com/posts/1');
    
    logger.info('First API call completed', {
      method: 'GET',
      statusCode: response1.statusCode,
      duration: response1.duration
    });

    // Example 2: POST request with data
    const postData = {
      title: 'Test Post',
      body: 'This is a test post',
      userId: 1
    };

    const response2 = await apiClient.post(
      'https://jsonplaceholder.typicode.com/posts',
      postData
    );

    logger.success('Second API call completed successfully', {
      method: 'POST',
      statusCode: response2.statusCode,
      duration: response2.duration
    });

    res.json({
      success: true,
      calls: [
        { method: 'GET', statusCode: response1.statusCode, duration: response1.duration },
        { method: 'POST', statusCode: response2.statusCode, duration: response2.duration }
      ]
    });

  } catch (error) {
    logger.error('External API test failed', error, {
      route: '/api/test-external',
      errorOccurredAt: new Date().toISOString()
    });

    res.status(500).json({ error: 'Failed to call external API' });
  }
});

/**
 * GET /api/debug
 * Endpoint demonstrating debug logging
 */
app.get('/api/debug', (req, res) => {
  const debugInfo = {
    timestamp: new Date(),
    queryParams: req.query,
    method: req.method,
    path: req.path
  };

  logger.debug('Debug information requested', debugInfo);

  res.json({ debug: debugInfo });
});

/**
 * GET /api/error
 * Endpoint demonstrating error handling
 */
app.get('/api/error', (req, res) => {
  logger.warning('Error simulation requested');

  const simulatedError = new Error('Simulated API error for testing');
  logger.error('Simulated error occurred', simulatedError, {
    endpoint: '/api/error',
    simulationMode: true
  });

  res.status(500).json({ error: 'Simulated error' });
});

// Error handling middleware (must be last)
app.use(errorLoggingMiddleware);

// ============================================
// STANDALONE EXAMPLE: Using API Client
// ============================================

/**
 * Example function showing standalone API client usage
 * This can be run independently of the Express server
 */
async function exampleApiClientUsage() {
  console.log('\n========== API Client Examples ==========\n');

  try {
    // Example 1: Simple GET request
    logger.info('Example 1: Simple GET Request');
    const response1 = await apiClient.get('https://jsonplaceholder.typicode.com/users/1');
    logger.debug('Response received', { statusCode: response1.statusCode });

    // Example 2: POST request with body
    logger.info('Example 2: POST Request with Body');
    const response2 = await apiClient.post(
      'https://jsonplaceholder.typicode.com/posts',
      { title: 'Test', body: 'Test body', userId: 1 }
    );
    logger.success('POST request successful', { statusCode: response2.statusCode });

    // Example 3: Request with query parameters
    logger.info('Example 3: GET with Query Parameters');
    const response3 = await apiClient.get(
      'https://jsonplaceholder.typicode.com/posts',
      { query: { userId: 1, _limit: 5 } }
    );
    logger.success('Query request successful', { statusCode: response3.statusCode });

    // Example 4: Request with timeout
    logger.info('Example 4: Request with Custom Timeout');
    const response4 = await apiClient.get(
      'https://jsonplaceholder.typicode.com/posts/1',
      { timeout: 3000 }
    );
    logger.success('Timeout request successful', { duration: response4.duration });

  } catch (error) {
    logger.error('Example API client usage encountered error', error);
  }
}

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.success(`Server started successfully`, { port: PORT });
  logger.info('Logging middleware is active', {
    endpoints: [
      'GET /api/status',
      'POST /api/test',
      'GET /api/test-external',
      'GET /api/debug',
      'GET /api/error'
    ]
  });

  // Uncomment the line below to run API client examples
  // exampleApiClientUsage();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.warning('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.warning('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
