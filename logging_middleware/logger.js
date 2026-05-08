/**
 * Logger Utility Module
 * Provides comprehensive logging functionality with multiple log levels
 * Captures: DEBUG, INFO, WARNING, ERROR, and SUCCESS events
 */

const fs = require('fs');
const path = require('path');

// Define log levels with their priorities
const LOG_LEVELS = {
  DEBUG: { level: 0, color: '\x1b[36m' }, // Cyan
  INFO: { level: 1, color: '\x1b[34m' }, // Blue
  WARNING: { level: 2, color: '\x1b[33m' }, // Yellow
  ERROR: { level: 3, color: '\x1b[31m' }, // Red
  SUCCESS: { level: 4, color: '\x1b[32m' } // Green
};

const RESET_COLOR = '\x1b[0m';

// Log file path
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

// Ensure log directory exists
function ensureLogDirExists() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format timestamp in ISO 8601 format
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log message with context and metadata
 * @param {string} level - Log level (DEBUG, INFO, WARNING, ERROR, SUCCESS)
 * @param {string} message - Main log message
 * @param {object} context - Additional context object
 * @param {object} metadata - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLog(level, message, context = {}, metadata = {}) {
  const timestamp = getTimestamp();
  const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context) : '';
  const metadataStr = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '';

  return {
    timestamp,
    level,
    message,
    context: contextStr || null,
    metadata: metadataStr || null
  };
}

/**
 * Write log to file (asynchronous, non-blocking)
 * @param {object} logData - Formatted log data
 */
function writeToFile(logData) {
  ensureLogDirExists();

  const logString = `[${logData.timestamp}] [${logData.level}] ${logData.message}${
    logData.context ? ` | Context: ${logData.context}` : ''
  }${logData.metadata ? ` | Metadata: ${logData.metadata}` : ''}\n`;

  fs.appendFile(LOG_FILE, logString, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}

/**
 * Console output with color coding
 * @param {string} level - Log level
 * @param {object} logData - Formatted log data
 */
function consoleOutput(level, logData) {
  const color = LOG_LEVELS[level].color;
  const output = `${color}[${logData.timestamp}] [${level}] ${logData.message}${RESET_COLOR}`;
  
  if (logData.context) console.log(`  Context: ${logData.context}`);
  if (logData.metadata) console.log(`  Metadata: ${logData.metadata}`);
  
  console.log(output);
}

/**
 * Main Logger Object
 */
const logger = {
  /**
   * Log debug information
   * @param {string} message - Debug message
   * @param {object} context - Context object (optional)
   * @param {object} metadata - Metadata object (optional)
   */
  debug(message, context = {}, metadata = {}) {
    const logData = formatLog('DEBUG', message, context, metadata);
    consoleOutput('DEBUG', logData);
    writeToFile(logData);
  },

  /**
   * Log informational message
   * @param {string} message - Info message
   * @param {object} context - Context object (optional)
   * @param {object} metadata - Metadata object (optional)
   */
  info(message, context = {}, metadata = {}) {
    const logData = formatLog('INFO', message, context, metadata);
    consoleOutput('INFO', logData);
    writeToFile(logData);
  },

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {object} context - Context object (optional)
   * @param {object} metadata - Metadata object (optional)
   */
  warning(message, context = {}, metadata = {}) {
    const logData = formatLog('WARNING', message, context, metadata);
    consoleOutput('WARNING', logData);
    writeToFile(logData);
  },

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {object} error - Error object or context (optional)
   * @param {object} metadata - Metadata object (optional)
   */
  error(message, error = {}, metadata = {}) {
    const errorContext = error instanceof Error 
      ? { 
          message: error.message, 
          stack: error.stack,
          name: error.name 
        }
      : error;
    
    const logData = formatLog('ERROR', message, errorContext, metadata);
    consoleOutput('ERROR', logData);
    writeToFile(logData);
  },

  /**
   * Log success message
   * @param {string} message - Success message
   * @param {object} context - Context object (optional)
   * @param {object} metadata - Metadata object (optional)
   */
  success(message, context = {}, metadata = {}) {
    const logData = formatLog('SUCCESS', message, context, metadata);
    consoleOutput('SUCCESS', logData);
    writeToFile(logData);
  }
};

module.exports = logger;
