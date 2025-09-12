import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SynapseHeader } from "@/components/synapse-header";
import { SynapseWelcome } from "@/components/synapse-welcome";
import { SynapseResultCard } from "@/components/synapse-result-card";
import { SynapseLoading } from "@/components/synapse-loading";
import { FileUpload } from "@/components/ui/file-upload";
import { Send, Paperclip, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "image" | "loading" | "result";
  data?: any;
}

type ChatState = "welcome" | "chatting";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>("welcome");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [loadingType, setLoadingType] = useState<"image" | "text">("text");
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
  }, [messages, isLoading, chatState]);

  const simulateProcessing = () => {
    setIsLoading(true);
    return new Promise(resolve => {
      setTimeout(() => {
        setIsLoading(false);
        resolve(null);
      }, 2500 + Math.random() * 1000);
    });
  };

  const generateBotResponse = async (userMessage: string, isImageUpload = false) => {
    await simulateProcessing();

    let partData;
    
    if (isImageUpload) {
      // Simulate image recognition
      partData = mockParts[Math.floor(Math.random() * mockParts.length)];
    } else if (userMessage.toLowerCase().includes('bearing') || userMessage.toLowerCase().includes('x-75')) {
      partData = mockParts[0];
    } else if (userMessage.toLowerCase().includes('motor') || userMessage.toLowerCase().includes('v200')) {
      partData = mockParts[1];
    } else if (userMessage.toLowerCase().includes('sensor') || userMessage.toLowerCase().includes('p450')) {
      partData = mockParts[2];
    } else {
      // Show not found message
      const response: Message = {
        id: Date.now().toString(),
        content: "I couldn't find an exact match for that description. Would you like to try again with more details or upload a photo of the part?",
        sender: "bot",
        timestamp: new Date(),
        type: "text"
      };
      setMessages(prev => [...prev, response]);
      return;
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
    setLoadingType("text");
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
    setLoadingType("image");
    setShowFileUpload(false);

    await generateBotResponse("", true);
  };

  const handleReset = () => {
    setMessages([]);
    setChatState("welcome");
    setShowFileUpload(false);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[700px] bg-card shadow-elegant border border-border/50">
      {/* Synapse Header */}
      <SynapseHeader />

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
              {messages.map((message) => {
                if (message.type === "result" && message.data) {
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