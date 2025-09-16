import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Camera, Database, Shield, Zap } from "lucide-react";

declare global {
  interface Window {
    microsoftTeams: any;
  }
}

const TeamsConfig = () => {
  useEffect(() => {
    // Load Teams SDK
    const script = document.createElement('script');
    script.src = 'https://res.cdn.office.net/teams-js/2.0.0/js/MicrosoftTeams.min.js';
    script.onload = () => {
      if (window.microsoftTeams) {
        window.microsoftTeams.app.initialize().then(() => {
          console.log("Teams context initialized");
          
          // Configure the tab
          window.microsoftTeams.pages.config.registerOnSaveHandler((saveEvent: any) => {
            const config = {
              entityId: "synapse-tab",
              contentUrl: window.location.origin + "/",
              suggestedDisplayName: "Synapse AI"
            };
            
            window.microsoftTeams.pages.config.setConfig(config);
            saveEvent.notifySuccess();
          });

          window.microsoftTeams.pages.config.setValidityState(true);
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSaveConfiguration = () => {
    if (window.microsoftTeams) {
      const config = {
        entityId: "synapse-tab",
        contentUrl: window.location.origin + "/",
        suggestedDisplayName: "Synapse AI"
      };
      
      window.microsoftTeams.pages.config.setConfig(config);
      window.microsoftTeams.pages.config.setValidityState(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-foreground">S</span>
            </div>
            <CardTitle className="text-2xl">Configure Synapse for Teams</CardTitle>
            <CardDescription>
              Add AI-powered spare parts intelligence to your Microsoft Teams workspace
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Camera className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium">Visual Recognition</h4>
                  <p className="text-sm text-muted-foreground">Camera & photo upload</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Database className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium">Real-time Data</h4>
                  <p className="text-sm text-muted-foreground">Live inventory status</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium">Warranty Info</h4>
                  <p className="text-sm text-muted-foreground">Coverage validation</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-medium">Teams Integration</h4>
                  <p className="text-sm text-muted-foreground">Seamless workflow</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                What you'll get:
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-4 h-4 p-0 border-success text-success">✓</Badge>
                  Instant part identification from photos
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-4 h-4 p-0 border-success text-success">✓</Badge>
                  Real-time inventory and availability checking
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-4 h-4 p-0 border-success text-success">✓</Badge>
                  Warranty status and expiration tracking
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-4 h-4 p-0 border-success text-success">✓</Badge>
                  Integrated directly into your Teams channels
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleSaveConfiguration}
              className="w-full bg-gradient-to-r from-primary to-synapse-blue-dark hover:from-synapse-blue-dark hover:to-primary"
              size="lg"
            >
              Add Synapse to This Team
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamsConfig;
