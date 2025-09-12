import { SparesChat } from "@/components/spares-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Camera, Database, Shield, Zap, CheckCircle } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                Microsoft Teams Integration
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                AI Spare Parts Copilot
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Revolutionize your assembly machine maintenance with intelligent part identification 
                and real-time inventory management powered by AI.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 text-sm bg-success/10 text-success-foreground px-3 py-2 rounded-full">
                <CheckCircle className="h-4 w-4" />
                <span>20 min → 30 seconds</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-full">
                <Bot className="h-4 w-4" />
                <span>Visual Recognition</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-warning/10 text-warning-foreground px-3 py-2 rounded-full">
                <Database className="h-4 w-4" />
                <span>Real-time Inventory</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="group hover:shadow-elegant transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Visual Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Upload photos to instantly identify spare parts using advanced AI models
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Inventory Check</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Real-time stock levels and availability across all warehouse locations
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Warranty Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Instant warranty validation and coverage information for all components
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Teams Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Seamlessly integrated into Microsoft Teams for instant access
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Chat Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Try the Demo</h2>
            <p className="text-muted-foreground">
              Experience how the Spares Copilot identifies parts and checks inventory in real-time
            </p>
          </div>
          
          <SparesChat />
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Try these sample queries:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="text-xs">Bearing X-75</Badge>
              <Badge variant="outline" className="text-xs">Motor Drive V200</Badge>
              <Badge variant="outline" className="text-xs">Proximity Sensor P450</Badge>
              <Badge variant="outline" className="text-xs">Upload part image</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Seamless Integration</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Built for Microsoft Teams with SharePoint data integration. 
              Access your BOM lists, inventory data, and warranty information in one unified interface.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">🔗</span>
                </div>
                <h3 className="font-semibold mb-2">SharePoint</h3>
                <p className="text-sm text-muted-foreground">Direct integration with your existing data sources</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">💬</span>
                </div>
                <h3 className="font-semibold mb-2">Teams Chat</h3>
                <p className="text-sm text-muted-foreground">Available as a bot in any Teams channel</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">⚡</span>
                </div>
                <h3 className="font-semibold mb-2">Instant Results</h3>
                <p className="text-sm text-muted-foreground">Get answers in seconds, not minutes</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
