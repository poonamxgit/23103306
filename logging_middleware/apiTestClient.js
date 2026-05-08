/**
 * API Test Client Module
 * Reusable function for making API calls to test server
 * Logs complete request-response cycle with proper context
 */

const http = require('http');
const https = require('https');
const logger = require('./logger');

/**
 * Determine if URL is HTTPS
 * @param {string} url - URL to check
 * @returns {boolean} True if HTTPS
 */
function isHttps(url) {
  return url.startsWith('https');
}

/**
 * Parse URL into components
 * @param {string} url - Full URL
 * @returns {object} Parsed URL components
 */
function parseUrl(url) {
  const urlObj = new URL(url);
  return {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    href: url
  };
}

/**
 * Main API Test Client Function
 * Makes reusable API calls to test server with comprehensive logging
 * 
 * @param {object} config - Configuration object
 * @param {string} config.url - Full URL of the endpoint
 * @param {string} config.method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {object} config.headers - Request headers (optional)
 * @param {*} config.body - Request body (optional, will be stringified)
 * @param {number} config.timeout - Request timeout in ms (optional, default: 5000)
 * @param {object} config.query - Query parameters (optional)
 * @returns {Promise<object>} Response object { statusCode, headers, body, duration }
 */
async function apiTestCall(config = {}) {
  const {
    url,
    method = 'GET',
    headers = {},
    body = null,
    timeout = 5000,
    query = {}
  } = config;

  // Validate required parameters
  if (!url) {
    const error = new Error('URL is required for API test call');
    logger.error('API Test Call Configuration Error', error);
    throw error;
  }

  const callId = generateCallId();
  const startTime = Date.now();
  let finalUrl = url;

  // Add query parameters to URL if provided
  if (Object.keys(query).length > 0) {
    const queryString = new URLSearchParams(query).toString();
    finalUrl += (url.includes('?') ? '&' : '?') + queryString;
  }

  // Log API call initiation
  logger.info('Starting API Test Call', {
    callId,
    method,
    url: finalUrl,
    hasBody: !!body,
    timeout: `${timeout}ms`
  });

  try {
    // Parse URL
    const urlComponents = parseUrl(finalUrl);
    const protocol = isHttps(finalUrl) ? https : http;

    // Prepare headers
    const requestHeaders = {
      'User-Agent': 'API-Test-Client/1.0',
      'Accept': 'application/json',
      ...headers
    };

    // Add content-length for body
    let bodyString = null;
    if (body) {
      bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
      requestHeaders['Content-Length'] = Buffer.byteLength(bodyString);

      logger.debug('API Request Body', {
        callId,
        bodySize: `${Buffer.byteLength(bodyString)} bytes`
      });
    }

    // Make the request
    return await new Promise((resolve, reject) => {
      const request = protocol.request(
        urlComponents.href,
        {
          method,
          headers: requestHeaders,
          timeout
        },
        (response) => {
          let responseBody = '';

          // Log response headers received
          logger.debug('API Response Headers Received', {
            callId,
            statusCode: response.statusCode,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length']
          });

          // Accumulate response body
          response.on('data', (chunk) => {
            responseBody += chunk.toString();
          });

          // Handle response completion
          response.on('end', () => {
            const duration = Date.now() - startTime;
            const isSuccess = response.statusCode >= 200 && response.statusCode < 300;

            // Log response outcome
            if (isSuccess) {
              logger.success('API Test Call Completed Successfully', {
                callId,
                statusCode: response.statusCode,
                duration: `${duration}ms`,
                bodySize: `${Buffer.byteLength(responseBody)} bytes`
              });
            } else if (response.statusCode >= 400 && response.statusCode < 500) {
              logger.warning('API Test Call Client Error', {
                callId,
                statusCode: response.statusCode,
                duration: `${duration}ms`,
                method,
                url: finalUrl
              });
            } else if (response.statusCode >= 500) {
              logger.error('API Test Call Server Error', 
                new Error(`HTTP ${response.statusCode}`),
                {
                  callId,
                  statusCode: response.statusCode,
                  duration: `${duration}ms`,
                  method,
                  url: finalUrl
                }
              );
            }

            // Log response body for debugging
            logger.debug('API Response Body', {
              callId,
              statusCode: response.statusCode
            }, {
              body: responseBody.substring(0, 500) + (responseBody.length > 500 ? '...[truncated]' : '')
            });

            resolve({
              statusCode: response.statusCode,
              headers: response.headers,
              body: responseBody,
              duration,
              callId
            });
          });
        }
      );

      // Handle request errors
      request.on('error', (err) => {
        const duration = Date.now() - startTime;

        logger.error('API Test Call Request Error', err, {
          callId,
          method,
          url: finalUrl,
          duration: `${duration}ms`,
          errorType: err.code || err.name
        });

        reject(err);
      });

      // Handle timeout
      request.on('timeout', () => {
        const duration = Date.now() - startTime;

        logger.error('API Test Call Timeout', 
          new Error(`Request timeout after ${timeout}ms`),
          {
            callId,
            method,
            url: finalUrl,
            duration: `${duration}ms`,
            configuredTimeout: `${timeout}ms`
          }
        );

        request.destroy();
        reject(new Error(`API request timeout after ${timeout}ms`));
      });

      // Send body if present
      if (bodyString) {
        request.write(bodyString);
      }

      request.end();
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('API Test Call Exception', error, {
      callId,
      method,
      url: finalUrl,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Generate unique call identifier
 * @returns {string} Unique call ID
 */
function generateCallId() {
  return `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convenience method for GET request
 * @param {string} url - Endpoint URL
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response object
 */
async function get(url, options = {}) {
  return apiTestCall({
    url,
    method: 'GET',
    ...options
  });
}

/**
 * Convenience method for POST request
 * @param {string} url - Endpoint URL
 * @param {*} body - Request body
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response object
 */
async function post(url, body, options = {}) {
  return apiTestCall({
    url,
    method: 'POST',
    body,
    ...options
  });
}

/**
 * Convenience method for PUT request
 * @param {string} url - Endpoint URL
 * @param {*} body - Request body
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response object
 */
async function put(url, body, options = {}) {
  return apiTestCall({
    url,
    method: 'PUT',
    body,
    ...options
  });
}

/**
 * Convenience method for DELETE request
 * @param {string} url - Endpoint URL
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response object
 */
async function deleteRequest(url, options = {}) {
  return apiTestCall({
    url,
    method: 'DELETE',
    ...options
  });
}

/**
 * Convenience method for PATCH request
 * @param {string} url - Endpoint URL
 * @param {*} body - Request body
 * @param {object} options - Additional options
 * @returns {Promise<object>} Response object
 */
async function patch(url, body, options = {}) {
  return apiTestCall({
    url,
    method: 'PATCH',
    body,
    ...options
  });
}

module.exports = {
  apiTestCall,
  get,
  post,
  put,
  delete: deleteRequest,
  patch
};
