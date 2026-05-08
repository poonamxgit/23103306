const WebSocket = require('ws');

module.exports = function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  // Store all connected WebSocket clients
  global.wsNotifications = new Set();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    console.log(`[WebSocket] Client connected with userId: ${userId}`);

    // Add client to global set
    global.wsNotifications.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      event: 'connected',
      message: `Connected to notification stream for user ${userId}`,
      timestamp: new Date().toISOString(),
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`[WebSocket] Message from ${userId}:`, message);

        // Echo back to client
        ws.send(JSON.stringify({
          event: 'echo',
          data: message,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      global.wsNotifications.delete(ws);
      console.log(`[WebSocket] Client disconnected for userId: ${userId}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for userId ${userId}:`, error);
    });
  });

  console.log('[WebSocket] Server initialized and listening for connections');
};
