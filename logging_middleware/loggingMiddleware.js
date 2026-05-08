/**
 * Logging Middleware Module
 * Comprehensive middleware for capturing entire request-response cycle
 * Logs: request arrival, processing details, success/error outcomes
 */

const logger = require('./logger');

/**
 * Parse request body (for logging purposes)
 * @param {object} req - Express request object
 * @returns {string} Stringified body or empty
 */
function parseRequestBody(req) {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      return JSON.stringify(req.body);
    }
  } catch (err) {
    return 'Unable to parse body';
  }
  return null;
}

/**
 * Get client IP address
 * @param {object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || 'Unknown';
}

/**
 * Main Logging Middleware Factory
 * @param {object} options - Configuration options
 * @returns {function} Express middleware function
 */
function createLoggingMiddleware(options = {}) {
  const {
    enableRequestBody = true,
    enableResponseBody = false,
    maxBodySize = 1000
  } = options;

  return (req, res, next) => {
    // Capture start time
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Log incoming request
    logger.info('Incoming Request', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      clientIp: getClientIp(req),
      userAgent: req.get('user-agent') || 'Unknown'
    }, {
      headers: {
        'content-type': req.get('content-type'),
        'accept': req.get('accept')
      }
    });

    // Log request body if enabled
    if (enableRequestBody && req.body) {
      const bodyStr = parseRequestBody(req);
      if (bodyStr) {
        const body = bodyStr.length > maxBodySize 
          ? bodyStr.substring(0, maxBodySize) + '...[truncated]'
          : bodyStr;
        logger.debug('Request Body', { requestId }, { body });
      }
    }

    // Capture original res.json and res.send for response logging
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function(data) {
      logResponse(res, data, requestId, startTime, 'json');
      return originalJson(data);
    };

    res.send = function(data) {
      logResponse(res, data, requestId, startTime, 'send');
      return originalSend(data);
    };

    // Handle errors that occur during processing
    res.on('error', (err) => {
      const duration = Date.now() - startTime;
      logger.error('Response Error', err, {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    });

    next();
  };
}

/**
 * Log response details
 * @param {object} res - Express response object
 * @param {*} data - Response data
 * @param {string} requestId - Request identifier
 * @param {number} startTime - Request start time
 * @param {string} method - Response method (json/send)
 */
function logResponse(res, data, requestId, startTime, method) {
  const duration = Date.now() - startTime;
  const statusCode = res.statusCode;
  const isSuccess = statusCode >= 200 && statusCode < 300;

  const responseContext = {
    requestId,
    statusCode,
    duration: `${duration}ms`,
    method,
    contentType: res.get('content-type')
  };

  if (isSuccess) {
    logger.success('Request Completed Successfully', responseContext, {
      dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length
    });
  } else if (statusCode >= 400) {
    logger.error('Request Failed', 
      new Error(`HTTP ${statusCode}`), 
      responseContext
    );
  } else {
    logger.warning('Unusual Response Status', responseContext);
  }

  logger.debug('Response Sent', responseContext);
}

/**
 * Generate unique request identifier
 * @returns {string} Unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error Logging Middleware (for async errors)
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function errorLoggingMiddleware(err, req, res, next) {
  const requestId = req.requestId || 'unknown';

  logger.error('Unhandled Application Error', err, {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    clientIp: getClientIp(req),
    timestamp: new Date().toISOString()
  });

  // Send error response
  res.status(err.statusCode || 500).json({
    error: true,
    message: err.message || 'Internal Server Error',
    requestId
  });
}

module.exports = {
  createLoggingMiddleware,
  errorLoggingMiddleware,
  logger
};
