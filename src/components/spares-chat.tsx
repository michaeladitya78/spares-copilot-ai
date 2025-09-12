import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ui/chat-message";
import { FileUpload } from "@/components/ui/file-upload";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { Send, Paperclip, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "image" | "status" | "inventory";
  data?: any;
}

const mockParts = [
  {
    partNumber: "BRG-X75-001",
    name: "Bearing Model X-75",
    machine: "Assembly Line A",
    inStock: true,
    quantity: 4,
    warranty: true,
    warrantyDate: "October 2026"
  },
  {
    partNumber: "MTR-V200-002",
    name: "Motor Drive V200",
    machine: "Packaging Unit B",
    inStock: false,
    quantity: 0,
    warranty: true,
    warrantyDate: "March 2025"
  },
  {
    partNumber: "SEN-P450-003",
    name: "Proximity Sensor P450",
    machine: "Quality Control Station",
    inStock: true,
    quantity: 12,
    warranty: false,
    warrantyDate: null
  }
];

export function SparesChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your Spares Copilot. I can help you identify spare parts and check inventory status. You can describe a part, provide a part number, or upload an image of the component you need.",
      sender: "bot",
      timestamp: new Date(),
      type: "text"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [messages, isTyping]);

  const simulateTyping = () => {
    setIsTyping(true);
    return new Promise(resolve => {
      setTimeout(() => {
        setIsTyping(false);
        resolve(null);
      }, 1500 + Math.random() * 1000);
    });
  };

  const generateBotResponse = async (userMessage: string, isImageUpload = false) => {
    await simulateTyping();

    let response: Message;
    
    if (isImageUpload) {
      // Simulate image recognition
      const randomPart = mockParts[Math.floor(Math.random() * mockParts.length)];
      response = {
        id: Date.now().toString(),
        content: `I've analyzed the uploaded image and identified this component as a **${randomPart.name}**. Here's the current status:`,
        sender: "bot",
        timestamp: new Date(),
        type: "inventory",
        data: randomPart
      };
    } else if (userMessage.toLowerCase().includes('bearing') || userMessage.toLowerCase().includes('x-75')) {
      response = {
        id: Date.now().toString(),
        content: "I found a match for your query! This appears to be a **Bearing Model X-75**. Here's the current status:",
        sender: "bot",
        timestamp: new Date(),
        type: "inventory",
        data: mockParts[0]
      };
    } else if (userMessage.toLowerCase().includes('motor') || userMessage.toLowerCase().includes('v200')) {
      response = {
        id: Date.now().toString(),
        content: "I identified this as a **Motor Drive V200**. Here's the current status:",
        sender: "bot",
        timestamp: new Date(),
        type: "inventory",
        data: mockParts[1]
      };
    } else if (userMessage.toLowerCase().includes('sensor') || userMessage.toLowerCase().includes('p450')) {
      response = {
        id: Date.now().toString(),
        content: "This component is a **Proximity Sensor P450**. Here's the current status:",
        sender: "bot",
        timestamp: new Date(),
        type: "inventory",
        data: mockParts[2]
      };
    } else {
      response = {
        id: Date.now().toString(),
        content: "I'd be happy to help you identify that part! Could you provide more details like:\n• Part number or model\n• Machine or assembly line name\n• Description of the component\n• Or upload an image of the part\n\nThis will help me find the exact match in our inventory system.",
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
    }

    setMessages(prev => [...prev, response]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue("");
    setShowFileUpload(false);

    await generateBotResponse(messageText);
  };

  const handleFileUpload = async (file: File) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: `Uploaded image: ${file.name}`,
      sender: "user",
      timestamp: new Date(),
      type: "image"
    };

    setMessages(prev => [...prev, userMessage]);
    setShowFileUpload(false);

    await generateBotResponse("", true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-card shadow-card">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="p-2 bg-primary rounded-lg">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Spares Copilot</h3>
          <p className="text-xs text-muted-foreground">AI Assistant for Spare Parts Management</p>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-2">
        <div className="space-y-2">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isTyping && (
            <div className="p-4">
              <TypingIndicator />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* File Upload Area */}
      {showFileUpload && (
        <div className="p-4 border-t bg-muted/20">
          <FileUpload
            onFileSelect={handleFileUpload}
            className="max-w-sm mx-auto"
          />
        </div>
      )}

      {/* Chat Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFileUpload(!showFileUpload)}
            className={cn(
              "shrink-0",
              showFileUpload && "bg-primary/10 border-primary/20"
            )}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the part or ask about inventory..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}