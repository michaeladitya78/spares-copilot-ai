import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob, imageDataUrl: string) => void;
  className?: string;
}

export const CameraCapture = React.forwardRef<HTMLDivElement, CameraCaptureProps>(
  ({ onCapture, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // prefer back camera
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        setError("Camera access denied or not available");
        console.error("Camera error:", err);
      }
    }, []);

    const stopCamera = useCallback(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsStreaming(false);
      setCapturedImage(null);
    }, []);

    const capturePhoto = useCallback(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Get image data
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
    }, []);

    const confirmCapture = useCallback(() => {
      if (!capturedImage || !canvasRef.current) return;

      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob, capturedImage);
          setIsOpen(false);
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }, [capturedImage, onCapture, stopCamera]);

    const retakePhoto = useCallback(() => {
      setCapturedImage(null);
    }, []);

    React.useEffect(() => {
      if (isOpen && !isStreaming && !capturedImage) {
        startCamera();
      }
    }, [isOpen, isStreaming, capturedImage, startCamera]);

    React.useEffect(() => {
      return () => {
        stopCamera();
      };
    }, [stopCamera]);

    // Add: fallback UI if camera is not available
    const isCameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    return (
      <div ref={ref} className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => isCameraSupported ? setIsOpen(true) : setError('Camera not supported on this device/browser')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Camera className="h-4 w-4" />
        </Button>
        {!isCameraSupported && (
          <div className="text-xs text-destructive mt-1">Camera not supported on this device/browser.</div>
        )}

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            stopCamera();
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Capture Part Photo
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                {!capturedImage ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-2 justify-center">
                {!capturedImage ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      disabled={!isStreaming}
                      className="flex-1 bg-gradient-to-r from-primary to-synapse-blue-dark hover:from-synapse-blue-dark hover:to-primary"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={retakePhoto}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                    <Button
                      onClick={confirmCapture}
                      className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/80 hover:to-success"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Use Photo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

CameraCapture.displayName = "CameraCapture";
