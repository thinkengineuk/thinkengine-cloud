import React, { useState, useEffect } from "react";
import { Attachment } from "@/entities/Attachment";
import { Button } from "@/components/ui/button";
import { UploadFile } from "@/integrations/Core";
import { Paperclip, Download, Trash2, Upload, ChevronDown, ChevronRight, FileText, Image as ImageIcon, Film } from "lucide-react";

export default function TaskAttachments({ task, onRefresh }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [task.id]);

  const loadAttachments = async () => {
    const data = await Attachment.filter({ task_id: task.id }, "-created_date");
    setAttachments(data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });

      await Attachment.create({
        task_id: task.id,
        file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      });

      loadAttachments();
      onRefresh();
    } catch (error) {
      alert("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!confirm("Delete this attachment?")) return;

    await Attachment.delete(attachmentId);
    loadAttachments();
    onRefresh();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType?.startsWith('video/')) return <Film className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="border-b border-slate-200 py-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-slate-50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-600" />
          )}
          <Paperclip className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Attachments</h3>
          {attachments.length > 0 && (
            <span className="text-sm text-slate-500">({attachments.length})</span>
          )}
        </div>
        <label className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </span>
          </Button>
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 pl-10">
          {attachments.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No attachments yet</p>
              <p className="text-xs mt-1">Supports all file types: documents, images, videos, spreadsheets, etc.</p>
            </div>
          ) : (
            attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-600">
                  {getFileIcon(attachment.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                    className="h-8 w-8"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(attachment.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}