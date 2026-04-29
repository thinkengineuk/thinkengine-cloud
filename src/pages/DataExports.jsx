import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Database, CheckCircle2, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";

export default function DataExports() {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingUri, setDownloadingUri] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.DataExport.list("-export_date", 24);
    setExports(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runExport = async () => {
    setRunning(true);
    await base44.functions.invoke("exportAllDataToCsv", {});
    await load();
    setRunning(false);
  };

  const handleDownload = async (file) => {
    setDownloadingUri(file.file_uri);
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: file.file_uri, expires_in: 300 });
    window.open(signed_url, "_blank");
    setDownloadingUri(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Data Exports</h1>
            <p className="text-sm text-slate-500">Monthly backups of all app data (private, secure)</p>
          </div>
        </div>
        <Button onClick={runExport} disabled={running} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Exporting..." : "Run Export Now"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : exports.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No exports yet. Run one manually or wait for the monthly schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exports.map(exp => (
            <div key={exp.id} className="border border-slate-200 rounded-xl bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {exp.status === "success"
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  }
                  <div>
                    <p className="font-semibold text-slate-800">
                      Export — {exp.export_date}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {exp.status === "success"
                        ? `${exp.total_rows_exported?.toLocaleString() || 0} total rows · ${exp.files?.length || 0} files`
                        : `Failed: ${exp.error_message}`
                      }
                    </p>
                  </div>
                </div>
                <Badge className={exp.status === "success"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-red-100 text-red-700 border-red-200"
                }>
                  {exp.status}
                </Badge>
              </div>

              {exp.status === "success" && exp.files?.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exp.files.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownload(file)}
                      disabled={downloadingUri === file.file_uri}
                      className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{file.entity_name}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">{file.row_count} rows</span>
                      </div>
                      <Download className={`w-4 h-4 flex-shrink-0 ${downloadingUri === file.file_uri ? "text-blue-400 animate-bounce" : "text-slate-400"}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}