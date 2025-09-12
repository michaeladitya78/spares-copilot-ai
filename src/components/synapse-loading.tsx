import * as React from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Database, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SynapseLoadingProps {
  type: "image" | "text";
  className?: string;
}

const loadingSteps = {
  image: [
    { icon: Search, text: "Analyzing image..." },
    { icon: Database, text: "Matching against database..." },
    { icon: CheckCircle, text: "Gathering information..." }
  ],
  text: [
    { icon: Search, text: "Searching for your part..." },
    { icon: Database, text: "Checking inventory..." },
    { icon: CheckCircle, text: "Verifying warranty status..." }
  ]
};

export const SynapseLoading = React.forwardRef<HTMLDivElement, SynapseLoadingProps>(
  ({ type, className }, ref) => {
    const [currentStep, setCurrentStep] = React.useState(0);
    const steps = loadingSteps[type];

    React.useEffect(() => {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, 1200);

      return () => clearInterval(interval);
    }, [steps.length]);

    return (
      <Card ref={ref} className={cn("p-6 bg-gradient-card border border-border/50", className)}>
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-primary/20 animate-pulse" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                      index <= currentStep
                        ? "bg-primary text-primary-foreground scale-100"
                        : "bg-muted text-muted-foreground scale-75"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                );
              })}
            </div>
            
            <p className="text-sm font-medium text-foreground transition-all duration-300">
              {steps[currentStep].text}
            </p>
            
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1200 ease-out"
                style={{ 
                  width: `${((currentStep + 1) / steps.length) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Powered by Synapse AI • Processing with enterprise-grade security
        </div>
      </Card>
    );
  }
);

SynapseLoading.displayName = "SynapseLoading";