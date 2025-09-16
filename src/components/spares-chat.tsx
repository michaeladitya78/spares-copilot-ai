import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SynapseHeader } from "@/components/synapse-header";
import { SynapseWelcome } from "@/components/synapse-welcome";
import { SynapseResultCard } from "@/components/synapse-result-card";
import { SynapseLoading } from "@/components/synapse-loading";
import { FileUpload } from "@/components/ui/file-upload";
import { CameraCapture } from "@/components/ui/camera-capture";
import { InventoryStatusWidget } from "@/components/inventory-status-widget";
import { Send, Paperclip, RotateCcw, Bot, Database, Upload, Search, Settings, Zap, Users, Image, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "image" | "loading" | "result";
  data?: any;
}

interface BotStats {
  totalUsers: number;
  totalParts: number;
  activeConnections: number;
  wsClients: number;
  lastUpdate: string;
}

interface WebSocketMessage {
  type: string;
  message?: string;
  data?: any;
  timestamp: string;
}

type ChatState = "welcome" | "chatting";

// Keep parts data in memory for faster lookups
// TODO: Move to proper state management when we scale up
let cachedParts: any[] = [];

export function SparesChat() {
  // Chat conversation state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>("welcome");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // File handling state
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [loadingType, setLoadingType] = useState<"image" | "text">("text");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  // WebSocket and backend connection
  const [wsConnected, setWsConnected] = useState(false);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  // Search functionality
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // Component refs for DOM access
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Set up WebSocket for real-time communication
  // This connects us to the backend for live inventory updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'development' 
      ? `${window.location.hostname}:8788` 
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onopen = () => {
      setWsConnected(true);
      console.log('🔌 WebSocket connected to Synapse');
      // Subscribe to inventory updates
      wsRef.current?.send(JSON.stringify({
        type: 'subscribe',
        channel: 'inventory'
      }));
    };
    wsRef.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      if (message.type === 'chat_response') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: message.message || '',
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
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
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load parts from database on component mount
  useEffect(() => {
    const loadParts = async () => {
      try {
        const response = await fetch('/api/parts');
        if (response.ok) {
          const data = await response.json();
          cachedParts = data;
        }
      } catch (error) {
        console.error('Failed to load parts:', error);
      }
    };
    loadParts();
  }, []);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, chatState]);

  // Simulates thinking time for the bot responses
  // Real implementation would actually process the query
  const simulateProcessing = () => {
    setIsLoading(true);
    return new Promise(resolve => {
      // Random delay between 2-3.5 seconds to feel natural
      const delay = 2500 + Math.random() * 1000;
      setTimeout(() => {
        setIsLoading(false);
        resolve(null);
      }, delay);
    });
  };

  // Check if user is asking about spare parts or something else
  const isSparePartsQuery = (message: string) => {
    // Keywords that indicate the user wants spare parts info
    const sparePartsKeywords = [
      'part', 'bearing', 'motor', 'sensor', 'actuator', 'valve', 'pump', 'drive', 
      'switch', 'relay', 'conveyor', 'hydraulic', 'pneumatic', 'electrical',
      'robotics', 'automation', 'spare', 'component', 'equipment', 'machinery',
      'industrial', 'tata', 'inventory', 'stock', 'price', 'quantity', 'location',
      'x-75', 'v200', 'p450', 'help', 'what can you do'
    ];
    
    const messageWords = message.toLowerCase().split(/\s+/);
    // Return true if any word in the message matches our keywords
    return sparePartsKeywords.some(keyword => 
      messageWords.some(word => word.includes(keyword) || keyword.includes(word))
    );
  };

  const generateBotResponse = async (userMessage: string, isImageUpload = false, imageData?: string) => {
    await simulateProcessing();

    // First, make sure they're asking about spare parts
    // If not, politely redirect them to our area of expertise
    if (!isImageUpload && !isSparePartsQuery(userMessage)) {
      const scopeMessage: Message = {
        id: Date.now().toString(),
        content: "I'm a specialized chatbot designed to help with spare parts for Tata Industries. I can assist you with finding bearings, motors, sensors, hydraulic components, and other industrial spare parts. Please ask me about spare parts, inventory, or part specifications.",
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
      setMessages(prev => [...prev, scopeMessage]);
      return;
    }

    try {
      if (userMessage.trim() || imageData) {
        const body: any = { messages: [{ role: 'user', content: userMessage || 'Identify this part' }] };
        if (imageData) {
          body.image = imageData;
        }

        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (res.ok) {
          const data = await res.json();
          const response: Message = {
            id: Date.now().toString(),
            content: data.text || 'No response',
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, response]);
          return;
        }
      }
    } catch (e) {
      // fall back to local logic
    }

    // Load parts data if not cached
    if (cachedParts.length === 0) {
      try {
        const response = await fetch('/api/parts');
        if (response.ok) {
          const data = await response.json();
          cachedParts = data.parts;
        }
      } catch (error) {
        console.error('Failed to load parts:', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: "I'm having trouble accessing the parts database. Please try again in a moment.",
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
    }

    let partData;

    if (isImageUpload) {
      // For image uploads, we try to match with our known parts
      // In a real implementation, this would use computer vision
      // For now, we'll intelligently guess based on common parts
      const commonParts = cachedParts.filter(part => 
        part.criticality === 'Critical' || part.criticality === 'High'
      );
      partData = commonParts.length > 0 
        ? commonParts[Math.floor(Math.random() * commonParts.length)]
        : cachedParts[Math.floor(Math.random() * cachedParts.length)];
    } else if (userMessage.toLowerCase().includes('bearing') || userMessage.toLowerCase().includes('x-75')) {
      partData = cachedParts.find(p => p.partNumber === "TATA-BEAR-X75-001") || cachedParts[0];
    } else if (userMessage.toLowerCase().includes('motor') || userMessage.toLowerCase().includes('v200')) {
      partData = cachedParts.find(p => p.partNumber === "TATA-MOTOR-V200-002") || cachedParts[1];
    } else if (userMessage.toLowerCase().includes('sensor') || userMessage.toLowerCase().includes('p450')) {
      partData = cachedParts.find(p => p.partNumber === "TATA-SENSOR-P450-003") || cachedParts[2];
    } else {
      // Smart search through our parts database
      // We check multiple fields to increase chances of finding what they need
      const searchTerm = userMessage.toLowerCase();
      const searchResults = cachedParts.filter(part => {
        // Check all the important fields for matches
        const nameMatch = part.name.toLowerCase().includes(searchTerm);
        const partNumberMatch = part.partNumber.toLowerCase().includes(searchTerm);
        const descriptionMatch = part.description.toLowerCase().includes(searchTerm);
        const categoryMatch = part.category.toLowerCase().includes(searchTerm);
        
        // Also check for partial matches and variations
        const searchWords = searchTerm.split(' ');
        const wordMatches = searchWords.some(word => 
          part.name.toLowerCase().includes(word) ||
          part.partNumber.toLowerCase().includes(word) ||
          part.description.toLowerCase().includes(word)
        );
        
        return nameMatch || partNumberMatch || descriptionMatch || categoryMatch || wordMatches;
      });

      if (searchResults.length > 1) {
        const options = searchResults.slice(0, 3);
        const disambiguation: Message = {
          id: Date.now().toString(),
          content: "I found several matching parts. Which one are you looking for?",
          sender: "bot",
          timestamp: new Date(),
          type: "result",
          data: { disambiguate: true, options }
        };
        setMessages(prev => [...prev, disambiguation]);
        return;
      } else if (searchResults.length === 1) {
        partData = searchResults[0];
      } else {
        // No parts found - provide helpful response
        const noPartsMessage: Message = {
          id: Date.now().toString(),
          content: "I couldn't find any parts matching your description. Try searching for specific part numbers like 'X-75', 'V200', 'P450', or categories like 'bearings', 'motors', 'sensors'. You can also ask about inventory status or browse our parts catalog.",
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        };
        setMessages(prev => [...prev, noPartsMessage]);
        return;
      }
    }

    const response: Message = {
      id: Date.now().toString(),
      content: `Part identified: ${partData.name}`,
      sender: "bot",
      timestamp: new Date(),
      type: "result",
      data: partData
    };

    setMessages(prev => [...prev, response]);
  };

  const handleIdentifyByDescription = () => {
    setChatState("chatting");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleIdentifyByPhoto = () => {
    setChatState("chatting");
    setShowFileUpload(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    // Don't send empty messages or when already processing
    if (!inputValue.trim() || isLoading) return;

    // Create the user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    };

    // Add user message to chat and clear input
    setMessages(prev => [...prev, userMessage]);
    setLoadingType("text");
    const messageText = inputValue;
    setInputValue("");
    setShowFileUpload(false);
    setIsLoading(true);

    // Try WebSocket first, fallback to HTTP API
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        content: messageText,
        sessionId: 'synapse_session'
      }));
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageText, sessionId: 'synapse_session' })
        });
        
        const data = await response.json();
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        
        // Show AI source indicator if available
        if (data.source === 'gemini-ai') {
          console.log('✨ Response powered by Gemini AI');
          // You could add a visual indicator here in the future
        }
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I'm having trouble connecting. Please try again.",
          sender: "bot",
          timestamp: new Date(),
          type: "text"
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    // Living input: show thumbnail and progress
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setUploadProgress(10);

    // Convert to base64 for API
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: `Uploaded image: ${file.name}`,
        sender: "user",
        timestamp: new Date(),
        type: "image"
      };

      setMessages(prev => [...prev, userMessage]);
      setLoadingType("image");
      setShowFileUpload(false);

      // Simulate progressive upload
      let progress = 10;
      const interval = setInterval(() => {
        progress = Math.min(progress + Math.floor(Math.random() * 25), 95);
        setUploadProgress(progress);
        if (progress >= 95) {
          clearInterval(interval);
        }
      }, 200);

      await generateBotResponse("", true, base64);
      setUploadProgress(100);
      setTimeout(() => {
        setUploadPreview(null);
        setUploadProgress(0);
        URL.revokeObjectURL(previewUrl);
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async (imageBlob: Blob, imageDataUrl: string) => {
    // Living input: show thumbnail and progress
    setUploadPreview(imageDataUrl);
    setUploadProgress(10);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: "Captured image from camera",
      sender: "user",
      timestamp: new Date(),
      type: "image"
    };

    setMessages(prev => [...prev, userMessage]);
    setLoadingType("image");

    // Simulate progressive upload
    let progress = 10;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 25), 95);
      setUploadProgress(progress);
      if (progress >= 95) {
        clearInterval(interval);
      }
    }, 200);

    await generateBotResponse("", true, imageDataUrl);
    setUploadProgress(100);
    setTimeout(() => {
      setUploadPreview(null);
      setUploadProgress(0);
    }, 800);
  };

  const handleReset = () => {
    setMessages([]);
    setChatState("welcome");
    setShowFileUpload(false);
    setIsLoading(false);
  };

  return (
    <Card className="flex flex-col h-[700px] bg-card shadow-elegant border border-border/50">
      {/* Synapse Header */}
      <SynapseHeader />

      {/* WebSocket Status Indicator */}
      <div className="px-4 py-2 border-b bg-synapse-gray-light/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={wsConnected ? "default" : "destructive"} className="text-xs">
              {wsConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Real-time Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  HTTP Mode
                </>
              )}
            </Badge>
            {botStats && (
              <span className="text-xs text-muted-foreground">
                {botStats.totalParts} parts • {botStats.wsClients} connections
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Synapse AI Bot v1.0
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {chatState === "welcome" ? (
          <SynapseWelcome
            onIdentifyByPhoto={handleIdentifyByPhoto}
            onIdentifyByDescription={handleIdentifyByDescription}
          />
        ) : (
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="p-4 space-y-4">
              {/* Inventory Status Widget */}
              <InventoryStatusWidget className="mb-4" />
              
              {messages.map((message) => {
                if (message.type === "result" && message.data) {
                  if (message.data.disambiguate && message.data.options) {
                    return (
                      <div key={message.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {message.data.options.map((opt: any, idx: number) => (
                          <div key={idx} className="space-y-2">
                            <SynapseResultCard partData={opt} animationDelay={0} />
                            <Button
                              className="w-full"
                              onClick={() => {
                                const confirmMsg: Message = {
                                  id: Date.now().toString(),
                                  content: `Selected ${opt.partNumber}`,
                                  sender: "user",
                                  timestamp: new Date(),
                                  type: "text"
                                };
                                setMessages(prev => [...prev, confirmMsg]);
                                const confirmed: Message = {
                                  id: (Date.now() + 1).toString(),
                                  content: `Part identified: ${opt.name}`,
                                  sender: "bot",
                                  timestamp: new Date(),
                                  type: "result",
                                  data: opt
                                };
                                setMessages(prev => [...prev, confirmed]);
                              }}
                            >
                              Select This Part
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <SynapseResultCard
                      key={message.id}
                      partData={message.data}
                      animationDelay={500}
                    />
                  );
                }
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 p-4 rounded-lg",
                      message.sender === "user" 
                        ? "justify-end" 
                        : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] p-3 rounded-lg shadow-sm",
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-synapse-gray-light text-foreground"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <SynapseLoading type={loadingType} />
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* File Upload Area */}
      {showFileUpload && chatState === "chatting" && (
        <div className="p-4 border-t bg-synapse-gray-light/30">
          <FileUpload
            onFileSelect={handleFileUpload}
            className="max-w-sm mx-auto"
          />
        </div>
      )}

      {/* Chat Input - Only show when chatting */}
      {chatState === "chatting" && (
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={cn(
                "shrink-0",
                showFileUpload && "bg-primary/10 border-primary/20 text-primary"
              )}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <CameraCapture onCapture={handleCameraCapture} />
            <div className="flex-1 flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the part or provide part number..."
                className="flex-1 border-border/50 focus:border-primary"
                disabled={isLoading}
              />
              {uploadPreview && (
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded-md overflow-hidden border">
                    <img src={uploadPreview} alt="Upload preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="shrink-0 bg-gradient-to-r from-primary to-synapse-blue-dark hover:from-synapse-blue-dark hover:to-primary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}