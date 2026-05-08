````markdown name=README.md
# Comprehensive Logging Middleware System

A production-ready logging middleware system for Node.js/Express applications that captures the entire request-response cycle and provides a reusable API test client with extensive logging capabilities.

## 📋 Features

### Core Components

1. **Logger Utility** (`logger.js`)
   - Multiple log levels: DEBUG, INFO, WARNING, ERROR, SUCCESS
   - Color-coded console output for easy identification
   - Automatic file logging with timestamps
   - Context and metadata support for rich logging information
   - Non-blocking asynchronous file writes

2. **Logging Middleware** (`loggingMiddleware.js`)
   - Captures complete request-response cycle
   - Request logging: method, URL, headers, body, client IP
   - Response logging: status code, duration, content type
   - Error tracking and detailed error context
   - Unique request ID tracking for request tracing
   - Configurable options for body logging

3. **API Test Client** (`apiTestClient.js`)
   - Reusable function for making HTTP/HTTPS requests
   - Comprehensive request-response cycle logging
   - Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)
   - Query parameter handling
   - Custom headers and timeouts
   - Detailed performance metrics (duration tracking)
   - Error logging with full context

## 🚀 Quick Start

### Installation

```bash
npm install express
```

### Basic Usage

#### 1. Using Logging Middleware with Express

```javascript
const express = require('express');
const { createLoggingMiddleware, errorLoggingMiddleware } = require('./loggingMiddleware');

const app = express();
app.use(express.json());

// Apply logging middleware
app.use(createLoggingMiddleware({
  enableRequestBody: true,
  enableResponseBody: true,
  maxBodySize: 1000
}));

// Your routes here...

// Error handling (must be last)
app.use(errorLoggingMiddleware);

app.listen(3000, () => console.log('Server running on port 3000'));
```

#### 2. Using the Logger Directly

```javascript
const logger = require('./logger');

// Different log levels
logger.debug('Debug message', { context: 'value' });
logger.info('Information message', { user: 'john' });
logger.warning('Warning message', { warning: 'something' });
logger.error('Error occurred', new Error('Something failed'), { details: 'info' });
logger.success('Operation successful', { result: 'success' });
```

#### 3. Using the API Test Client

```javascript
const apiClient = require('./apiTestClient');

// Simple GET request
const response = await apiClient.get('https://api.example.com/endpoint');

// POST request with data
const postResponse = await apiClient.post(
  'https://api.example.com/posts',
  { title: 'Hello', body: 'World' }
);

// Request with query parameters
const queryResponse = await apiClient.get(
  'https://api.example.com/posts',
  { query: { userId: 1, limit: 10 } }
);

// Request with custom timeout
const customResponse = await apiClient.get(
  'https://api.example.com/data',
  { timeout: 5000 }
);
```

## 📚 API Reference

### Logger Methods

```javascript
logger.debug(message, context, metadata)
logger.info(message, context, metadata)
logger.warning(message, context, metadata)
logger.error(message, error, metadata)
logger.success(message, context, metadata)
```

**Parameters:**
- `message` (string): The main log message
- `context` (object): Contextual information related to the log
- `metadata` (object): Additional metadata
- `error` (Error|object): Error object or error context

### Logging Middleware

```javascript
createLoggingMiddleware(options)
```

**Options:**
```javascript
{
  enableRequestBody: boolean,      // Log request body (default: true)
  enableResponseBody: boolean,     // Log response body (default: false)
  maxBodySize: number              // Max body size to log (default: 1000)
}
```

### API Test Client

```javascript
apiTestCall(config)
```

**Config Object:**
```javascript
{
  url: string,                     // Required: Full endpoint URL
  method: string,                  // HTTP method (default: 'GET')
  headers: object,                 // Custom headers
  body: any,                       // Request body (auto-stringified)
  timeout: number,                 // Timeout in ms (default: 5000)
  query: object                    // Query parameters
}
```

**Convenience Methods:**
```javascript
apiClient.get(url, options)
apiClient.post(url, body, options)
apiClient.put(url, body, options)
apiClient.delete(url, options)
apiClient.patch(url, body, options)
```

**Response Object:**
```javascript
{
  statusCode: number,              // HTTP status code
  headers: object,                 // Response headers
  body: string,                    // Response body
  duration: number,                // Request duration in ms
  callId: string                   // Unique call identifier
}
```

## 📊 Log Levels

| Level   | Color  | Use Case                              |
|---------|--------|---------------------------------------|
| DEBUG   | Cyan   | Detailed debugging information        |
| INFO    | Blue   | General informational messages        |
| WARNING | Yellow | Warning conditions and anomalies      |
| ERROR   | Red    | Error conditions and exceptions       |
| SUCCESS | Green  | Successful operations                 |

## 📁 File Structure

```
logging_middleware/
├── logger.js                  # Core logging utility
├── loggingMiddleware.js       # Express middleware
├── apiTestClient.js           # API test client
├── example.js                 # Example usage and routes
├── package.json               # Dependencies
└── README.md                  # This file
```

## 📝 Log Output

### Console Output
- Color-coded by log level
- Includes timestamp, level, and message
- Context and metadata displayed below main message

### File Output
- Stored in `logs/` directory
- One file per day: `app-YYYY-MM-DD.log`
- Format: `[timestamp] [level] message | Context: {...} | Metadata: {...}`

## 🔍 Example Scenarios

### Scenario 1: Successful API Call
```
[2026-05-08T12:34:56.789Z] [INFO] Starting API Test Call
  Context: { "callId": "api-1234567890", "method": "GET", ... }
[2026-05-08T12:34:57.123Z] [SUCCESS] API Test Call Completed Successfully
  Context: { "callId": "api-1234567890", "statusCode": 200, ... }
```

### Scenario 2: Request Error
```
[2026-05-08T12:35:00.000Z] [INFO] Incoming Request
  Context: { "requestId": "1234567890-abc123", "method": "POST", ... }
[2026-05-08T12:35:00.050Z] [DEBUG] Request Body
  Context: { "requestId": "1234567890-abc123" }
[2026-05-08T12:35:00.100Z] [ERROR] Request Failed
  Context: { "statusCode": 404, "duration": "100ms", ... }
```

### Scenario 3: API Timeout
```
[2026-05-08T12:36:00.000Z] [INFO] Starting API Test Call
  Context: { "callId": "api-1234567890", "timeout": "5000ms", ... }
[2026-05-08T12:36:05.000Z] [ERROR] API Test Call Timeout
  Context: { "callId": "api-1234567890", "configuredTimeout": "5000ms", ... }
```

## 🔧 Configuration Examples

### Production Configuration
```javascript
app.use(createLoggingMiddleware({
  enableRequestBody: false,      // Don't log body in production
  enableResponseBody: false,
  maxBodySize: 500
}));
```

### Development Configuration
```javascript
app.use(createLoggingMiddleware({
  enableRequestBody: true,
  enableResponseBody: true,
  maxBodySize: 5000
}));
```

## 🛡️ Error Handling

The system provides comprehensive error handling:

1. **Request Errors**: Network errors, timeouts, connection issues
2. **Response Errors**: HTTP error status codes (4xx, 5xx)
3. **Unhandled Errors**: Caught by error logging middleware
4. **Async Errors**: Properly tracked with error context

All errors are logged with:
- Error message and stack trace
- Request/response context
- Duration and timestamp
- Unique identifiers for tracing

## 🎯 Best Practices

1. **Use Request IDs**: Enable request tracing across logs
2. **Log Context**: Always include relevant context for debugging
3. **Appropriate Levels**: Use correct log level for each message
4. **Avoid Sensitive Data**: Don't log passwords, tokens, or PII
5. **Monitor Log Files**: Implement log rotation for production
6. **Test Error Paths**: Ensure error logging works properly

## 🚦 Performance Considerations

- Non-blocking file operations using async writes
- Configurable body size limits to prevent large logs
- Efficient string truncation for large responses
- Minimal overhead on request-response cycle

## 📄 License

MIT

## 📧 Support

For issues or questions, refer to the example.js file for detailed usage examples.
````
