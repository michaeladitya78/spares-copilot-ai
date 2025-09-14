#!/usr/bin/env node

import fetch from 'node-fetch';
import WebSocket from 'ws';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8787';
const WS_URL = BASE_URL.replace('http', 'ws') + '/ws';

console.log('🧪 Testing Synapse API - All Endpoints');
console.log('=====================================');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
}

async function testEndpoint(method, path, body = null, expectedStatus = 200) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.text();
    
    if (response.status === expectedStatus) {
      return { success: true, data: data ? JSON.parse(data) : null };
    } else {
      return { success: false, error: `Expected ${expectedStatus}, got ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testWebSocket() {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let connected = false;
    let messageReceived = false;
    
    ws.on('open', () => {
      connected = true;
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'pong') {
        messageReceived = true;
        ws.close();
      }
    });
    
    ws.on('close', () => {
      resolve({ connected, messageReceived });
    });
    
    ws.on('error', () => {
      resolve({ connected: false, messageReceived: false });
    });
    
    setTimeout(() => {
      ws.close();
      resolve({ connected, messageReceived });
    }, 5000);
  });
}

async function runTests() {
  console.log('\n🔍 Testing Core APIs...');
  
  // Health check
  const health = await testEndpoint('GET', '/api/health');
  logTest('Health Check', health.success, health.error);
  
  // Enterprise stats
  const stats = await testEndpoint('GET', '/api/enterprise/stats');
  logTest('Enterprise Stats', stats.success, stats.error);
  
  // WebSocket stats
  const wsStats = await testEndpoint('GET', '/api/websocket/stats');
  logTest('WebSocket Stats', wsStats.success, wsStats.error);
  
  // Scaling profiles
  const profiles = await testEndpoint('GET', '/api/scaling/profiles');
  logTest('Scaling Profiles', profiles.success, profiles.error);
  
  // Chat endpoint
  const chat = await testEndpoint('POST', '/api/chat', {
    message: 'Hello, test message',
    sessionId: 'test_session'
  });
  logTest('Chat API', chat.success, chat.error);
  
  // User search
  const search = await testEndpoint('GET', '/api/users/search?q=test');
  logTest('User Search', search.success, search.error);
  
  // Inventory status
  const inventory = await testEndpoint('GET', '/api/inventory/status');
  logTest('Inventory Status', inventory.success, inventory.error);
  
  // Parts list
  const parts = await testEndpoint('GET', '/api/parts');
  logTest('Parts List', parts.success, parts.error);
  
  console.log('\n🔌 Testing WebSocket...');
  const wsTest = await testWebSocket();
  logTest('WebSocket Connection', wsTest.connected, 'Failed to connect');
  logTest('WebSocket Message', wsTest.messageReceived, 'No pong received');
  
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }
  
  console.log('\n🚀 Deployment URLs:');
  console.log(`  Local: ${BASE_URL}`);
  console.log(`  Bot Interface: ${BASE_URL}/bot`);
  console.log(`  API Docs: ${BASE_URL}/api/docs`);
  console.log(`  WebSocket: ${WS_URL}`);
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
