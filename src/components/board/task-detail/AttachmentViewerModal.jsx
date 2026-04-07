import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText } from "lucide-react";

export default function AttachmentViewerModal({ attachment, onClose }) {
  if (!attachment) return null;

  const isImage = attachment.file_type?.startsWith("image/");
  const isVideo = attachment.file_type?.startsWith("video/");
  const isPdf = attachment.file_type === "application/pdf";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = attachment.file_url;
    a.download = attachment.file_name;
    a.target = "_blank";
    a.click();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/90 border-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60">
          <span className="text-white text-sm font-medium truncate max-w-xs">{attachment.file_name}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center min-h-[400px] max-h-[75vh] bg-black/80 p-4">
          {isImage && (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
          {isVideo && (
            <video
              src={attachment.file_url}
              controls
              autoPlay
              className="max-w-full max-h-[70vh] rounded"
            />
          )}
          {isPdf && (
            <iframe
              src={attachment.file_url}
              title={attachment.file_name}
              className="w-full h-[70vh] rounded bg-white"
            />
          )}
          {!isImage && !isVideo && !isPdf && (
            <div className="text-center text-white space-y-4">
              <FileText className="w-16 h-16 mx-auto opacity-50" />
              <p className="text-sm opacity-75">Preview not available for this file type</p>
              <Button onClick={handleDownload} className="bg-white text-black hover:bg-white/90 gap-2">
                <Download className="w-4 h-4" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}