import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, User, CheckCircle, AlertCircle, Package } from "lucide-react";

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    type?: "text" | "image" | "status" | "inventory";
    data?: any;
  };
  className?: string;
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ message, className }, ref) => {
    const isBot = message.sender === "bot";

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 p-4 rounded-lg transition-all duration-200",
          isBot ? "bg-muted/50" : "bg-background",
          className
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn(
            "text-xs font-medium",
            isBot ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          )}>
            {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isBot ? "Spares Copilot" : "You"}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <div className="text-sm text-foreground leading-relaxed">
            {message.content}
          </div>

          {message.type === "inventory" && message.data && (
            <div className="mt-3 space-y-2">
              <div className="p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Part Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Part Number:</span>
                    <div className="font-mono">{message.data.partNumber}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Machine:</span>
                    <div>{message.data.machine}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge
                  variant={message.data.inStock ? "default" : "destructive"}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {message.data.inStock ? `${message.data.quantity} in stock` : "Out of stock"}
                </Badge>
                
                <Badge
                  variant={message.data.warranty ? "default" : "secondary"}
                  className="text-xs"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {message.data.warranty ? `Warranty until ${message.data.warrantyDate}` : "No warranty"}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";