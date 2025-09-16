import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, MessageSquare, Clock, Database, Cpu, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SynapseWelcomeProps {
  onIdentifyByPhoto: () => void;
  onIdentifyByDescription: () => void;
  className?: string;
}

export const SynapseWelcome = React.forwardRef<HTMLDivElement, SynapseWelcomeProps>(
  ({ onIdentifyByPhoto, onIdentifyByDescription, className }, ref) => {
    return (
      <div ref={ref} className={cn("p-6 space-y-6", className)}>
        {/* Welcome Message */
         /* Vision: Five-Minute Fix */}
        <div className="text-center space-y-3 animate-fade-in">
          <h2 className="text-xl font-semibold text-foreground">Synapse is ready.</h2>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
            Upload a photo or describe the part you need. Get the right answer in under five minutes.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger-1">
          <Button
            onClick={onIdentifyByPhoto}
            size="lg"
            className={cn(
              "h-20 flex-col gap-2 bg-gradient-to-br from-primary to-synapse-blue-dark",
              "hover:from-synapse-blue-dark hover:to-primary",
              "shadow-card hover:shadow-elegant transition-all duration-300",
              "transform hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <Camera className="h-6 w-6" />
            <span className="font-medium">Identify by Photo</span>
          </Button>

          <Button
            onClick={onIdentifyByDescription}
            size="lg"
            variant="outline"
            className={cn(
              "h-20 flex-col gap-2 border-2 border-primary/20",
              "hover:bg-synapse-blue-light hover:border-primary/40",
              "shadow-card hover:shadow-elegant transition-all duration-300",
              "transform hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="font-medium text-primary">Identify by Description</span>
          </Button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8 animate-stagger-2">
          <Card className="p-4 bg-gradient-to-br from-background to-synapse-gray-light/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Speed to Answer</p>
                <p className="text-xs text-muted-foreground">Under 3 seconds</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-background to-synapse-gray-light/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Database className="h-4 w-4 text-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Real-time Data</p>
                <p className="text-xs text-muted-foreground">Live inventory status</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-background to-synapse-gray-light/50 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Cpu className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">AI-Powered</p>
                <p className="text-xs text-muted-foreground">Smart identification</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-r from-synapse-blue-light/30 to-success/5 rounded-lg p-4 animate-stagger-3">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="text-lg font-bold text-synapse-blue">99.2%</div>
              <div className="text-xs text-muted-foreground">Accuracy Rate</div>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-success">2.3s</div>
              <div className="text-xs text-muted-foreground">Avg Response</div>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-accent">15K+</div>
              <div className="text-xs text-muted-foreground">Parts Database</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SynapseWelcome.displayName = "SynapseWelcome";