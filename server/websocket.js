import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        id: clientId,
        connectedAt: new Date(),
        subscriptions: new Set()
      });

      console.log(`🔌 WebSocket client connected: ${clientId}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        clientId,
        message: 'Connected to Synapse WebSocket',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON message',
            timestamp: new Date().toISOString()
          }));
        }
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    console.log('🔌 WebSocket server initialized on /ws');
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.channel);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.channel);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'chat':
        this.handleChatMessage(clientId, message);
        break;
      case 'inventory_update':
        this.handleInventoryUpdate(clientId, message);
        break;
      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString()
        });
    }
  }

  handleSubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client && channel) {
      client.subscriptions.add(channel);
      this.sendToClient(clientId, {
        type: 'subscribed',
        channel,
        message: `Subscribed to ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleUnsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (client && channel) {
      client.subscriptions.delete(channel);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        channel,
        message: `Unsubscribed from ${channel}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleChatMessage(clientId, message) {
    // Forward chat messages to RAG service
    this.emit('chat', {
      clientId,
      message: message.content,
      sessionId: message.sessionId || 'ws_session'
    });
  }

  handleInventoryUpdate(clientId, message) {
    // Handle inventory updates via WebSocket
    this.emit('inventory_update', {
      clientId,
      partId: message.partId,
      quantity: message.quantity,
      action: message.action
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN = 1
      client.ws.send(JSON.stringify(data));
    }
  }

  broadcastToChannel(channel, data) {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(clientId, {
          type: 'broadcast',
          channel,
          data,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  broadcastToAll(data) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, {
        type: 'broadcast',
        data,
        timestamp: new Date().toISOString()
      });
    });
  }

  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions)
    }));
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      clients: this.getConnectedClients()
    };
  }
}
