import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({ onFileSelect, className, disabled }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        setSelectedFile(files[0]);
        onFileSelect?.(files[0]);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect?.(file);
      }
    };

    const clearFile = () => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200",
            isDragOver && !disabled ? "border-primary bg-primary/5" : "border-border",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "hover:border-primary/50 cursor-pointer"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          
          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Image className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ready to identify part
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className={cn(
                "h-8 w-8 mx-auto",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <p className="text-sm font-medium">
                  Upload spare part image
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop or click to select
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";