import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Bot, Database, Upload, Search, Settings, Zap, Users, Image, MessageSquare } from 'lucide-react';

interface BotStats {
  totalUsers: number;
  totalParts: number;
  activeConnections: number;
  wsClients: number;
  lastUpdate: string;
}

interface ImportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  totalRows: number;
  processedRows: number;
  errors: string[];
}

interface WebSocketMessage {
  type: string;
  message?: string;
  data?: any;
  timestamp: string;
}

export default function SynapseBot() {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'bot', content: string, timestamp: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsMessages, setWsMessages] = useState<WebSocketMessage[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setWsConnected(true);
      console.log('🔌 WebSocket connected');
      
      // Subscribe to inventory updates
      wsRef.current?.send(JSON.stringify({
        type: 'subscribe',
        channel: 'inventory'
      }));
    };
    
    wsRef.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      setWsMessages(prev => [...prev.slice(-9), message]);
      
      if (message.type === 'chat_response') {
        setChatHistory(prev => [...prev, {
          role: 'bot',
          content: message.message || '',
          timestamp: message.timestamp
        }]);
        setIsLoading(false);
      }
    };
    
    wsRef.current.onclose = () => {
      setWsConnected(false);
      console.log('🔌 WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Load bot stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/enterprise/stats');
        const stats = await response.json();
        setBotStats(stats);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    
    // Add user message to history
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);
    
    // Send via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        content: userMessage,
        sessionId: 'bot_session'
      }));
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, sessionId: 'bot_session' })
        });
        const data = await response.json();
        
        setChatHistory(prev => [...prev, {
          role: 'bot',
          content: data.response,
          timestamp: new Date().toISOString()
        }]);
        setIsLoading(false);
      } catch (error) {
        console.error('Chat error:', error);
        setIsLoading(false);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/import/enterprise', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.jobId) {
        setImportStatus({
          id: result.jobId,
          status: 'processing',
          progress: 0,
          totalRows: 0,
          processedRows: 0,
          errors: []
        });
        
        // Poll for status updates
        const pollStatus = async () => {
          try {
            const statusResponse = await fetch(`/api/users/import/${result.jobId}/status`);
            const status = await statusResponse.json();
            setImportStatus(status);
            
            if (status.status === 'processing') {
              setTimeout(pollStatus, 2000);
            }
          } catch (error) {
            console.error('Status poll error:', error);
          }
        };
        
        setTimeout(pollStatus, 1000);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const results = await response.json();
      setSearchResults(results.users || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        const ocrText = result.image.ocrText || 'No text detected';
        const imageInfo = `Image uploaded: ${result.image.filename} (${(result.image.size / 1024 / 1024).toFixed(2)}MB)`;
        
        setChatHistory(prev => [...prev, {
          role: 'bot',
          content: `${imageInfo}\n\nOCR Text: ${ocrText}`,
          timestamp: new Date().toISOString()
        }]);
        
        // Send image analysis via WebSocket if connected
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'image_analysis',
            filename: result.image.filename,
            ocrText: ocrText,
            size: result.image.size
          }));
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setChatHistory(prev => [...prev, {
        role: 'bot',
        content: `Image upload failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Synapse AI Bot - Complete API Integration
            <Badge variant={wsConnected ? "default" : "destructive"}>
              {wsConnected ? "WebSocket Connected" : "WebSocket Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Import
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-1">
                <Image className="h-4 w-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-2">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything about your data..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !message.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Data Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload CSV/XLSX File</label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  <Button onClick={handleFileUpload} disabled={!uploadFile || isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import Data"}
                  </Button>
                  
                  {importStatus && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div>Status: {importStatus.status}</div>
                          <div>Progress: {importStatus.progress}%</div>
                          <div>Processed: {importStatus.processedRows} / {importStatus.totalRows}</div>
                          {importStatus.errors.length > 0 && (
                            <div>Errors: {importStatus.errors.length}</div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Search Results:</h3>
                  {searchResults.map((user, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-3">
                        <div className="text-sm">
                          <div className="font-medium">{user.name || 'Unknown'}</div>
                          <div className="text-gray-600">{user.email || 'No email'}</div>
                          <div className="text-gray-500">{user.department || 'No department'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Image Processing & OCR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload Image (Max 100MB)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  <Button onClick={handleImageUpload} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process Image"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Database Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {botStats ? (
                      <div className="space-y-2">
                        <div>Total Users: {botStats.totalUsers}</div>
                        <div>Total Parts: {botStats.totalParts}</div>
                        <div>Active Connections: {botStats.activeConnections}</div>
                        <div>Last Update: {new Date(botStats.lastUpdate).toLocaleString()}</div>
                      </div>
                    ) : (
                      <div>Loading stats...</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      WebSocket Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>Connected Clients: {botStats?.wsClients || 0}</div>
                      <div>Status: {wsConnected ? "Connected" : "Disconnected"}</div>
                      <div>Messages: {wsMessages.length}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {wsMessages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent WebSocket Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {wsMessages.slice(-5).map((msg, idx) => (
                        <div key={idx} className="text-sm p-2 bg-gray-100 rounded">
                          <div className="font-medium">{msg.type}</div>
                          <div className="text-gray-600">{msg.message || JSON.stringify(msg.data)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bot Configuration & Testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Available APIs:</h3>
                    <ul className="text-sm space-y-1">
                      <li>✅ Chat API (RAG + Local AI)</li>
                      <li>✅ Enterprise Import (10M+ records)</li>
                      <li>✅ Image Processing (OCR + Vision)</li>
                      <li>✅ WebSocket Real-time Updates</li>
                      <li>✅ Vector Search (pgvector)</li>
                      <li>✅ Teams Bot Integration</li>
                      <li>✅ Redis Caching</li>
                      <li>✅ Adaptive Scaling</li>
                      <li>✅ Parts Management</li>
                      <li>✅ Inventory Tracking</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">All Endpoints:</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="font-medium text-green-600">Core APIs:</div>
                        <ul className="space-y-1">
                          <li>POST /api/chat - Chat with RAG</li>
                          <li>GET /api/health - Health check</li>
                          <li>GET /api/enterprise/stats - System stats</li>
                          <li>GET /api/inventory/status - Inventory status</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">Data APIs:</div>
                        <ul className="space-y-1">
                          <li>POST /api/users/import/enterprise - Import datasets</li>
                          <li>GET /api/users/search - Vector search</li>
                          <li>GET /api/parts - Parts list</li>
                          <li>POST /api/parts/:id/request - Request part</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-purple-600">Media APIs:</div>
                        <ul className="space-y-1">
                          <li>POST /api/images/upload - Image processing</li>
                          <li>GET /api/images/:id - Get image</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-orange-600">Real-time:</div>
                        <ul className="space-y-1">
                          <li>WebSocket /ws - Real-time updates</li>
                          <li>GET /api/events - SSE stream</li>
                          <li>GET /api/websocket/stats - WS stats</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">Quick Tests:</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open('/api/health', '_blank')}
                      >
                        Test Health
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open('/api/docs', '_blank')}
                      >
                        API Docs
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const ws = new WebSocket(`ws://${window.location.host}/ws`);
                          ws.onopen = () => {
                            ws.send(JSON.stringify({type: 'ping'}));
                            alert('WebSocket test successful!');
                            ws.close();
                          };
                          ws.onerror = () => alert('WebSocket test failed!');
                        }}
                      >
                        Test WebSocket
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
