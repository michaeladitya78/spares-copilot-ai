import { EventEmitter } from 'events';

// Central event bus for real-time notifications (inventory, imports, chat, etc.)
export const events = new EventEmitter();

// Helper to create an SSE stream
export function createSSEStream(req, res, { retryMs = 10000 } = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial retry directive
  res.write(`retry: ${retryMs}\n\n`);

  // Heartbeat to keep the connection alive
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`event: heartbeat\n`);
      res.write(`data: {"ts": ${Date.now()}}\n\n`);
    }
  }, 15000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });

  return res;
}

export function sendSSE(res, event, data) {
  if (res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}


