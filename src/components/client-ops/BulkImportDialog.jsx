import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Upload } from "lucide-react";

const EXPECTED_HEADERS = [
  "name", "company", "agreement_type", "client_type",
  "client_lead", "client_exec", "client_exec_2", "website_creative", "tech_lead",
  "services", "how_to_use_link"
];

const CSV_TEMPLATE = EXPECTED_HEADERS.join(",") + "\n" +
  "Acme Ltd,ThinkEngine Marketing,Annual,Retained,,,,,,,\n" +
  "Beta Co,Cogs,Monthly Rolling,Retained,,,,,,,";

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["Need at least a header row and one data row."] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });

    if (!row.name) { errors.push(`Row ${i}: missing company name`); continue; }
    if (!["ThinkEngine Marketing", "ThinkEngine Tech", "Cogs"].includes(row.company)) {
      errors.push(`Row ${i} (${row.name}): company must be "ThinkEngine Marketing", "ThinkEngine Tech", or "Cogs"`);
      continue;
    }

    // Parse services (semicolon separated within the CSV cell)
    const services = row.services ? row.services.split(";").map(s => s.trim()).filter(Boolean) : [];

    rows.push({
      name: row.name,
      company: row.company,
      agreement_type: row.agreement_type || "",
      client_type: row.client_type === "Project" ? "Project" : "Retained",
      client_lead: row.client_lead || "",
      client_exec: row.client_exec || "",
      client_exec_2: row.client_exec_2 || "",
      website_creative: row.website_creative || "",
      tech_lead: row.tech_lead || "",
      how_to_use_link: row.how_to_use_link || "",
      services,
      current_stage: "Part 1 - Client Requirements Call",
      stage_started_at: { "Part 1 - Client Requirements Call": new Date().toISOString().slice(0, 10) },
      start_date: new Date().toISOString().slice(0, 10),
    });
  }

  return { rows, errors };
}

export default function BulkImportDialog({ open, onOpenChange, onImported }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleParse = () => {
    const { rows, errors } = parseCSV(csvText);
    setPreview({ rows, errors });
    setResult(null);
  };

  const handleImport = async () => {
    if (!preview?.rows?.length) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of preview.rows) {
      try {
        await base44.entities.ClientProject.create(row);
        success++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ success, failed });
    if (success > 0) onImported();
  };

  const handleClose = () => {
    setCsvText("");
    setPreview(null);
    setResult(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client_operations_template.csv";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Clients</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">CSV Format</p>
            <p>Columns: <code className="bg-blue-100 px-1 rounded text-xs">{EXPECTED_HEADERS.join(", ")}</code></p>
            <p className="mt-1">For multiple services, separate with semicolons inside the cell, e.g. <code className="bg-blue-100 px-1 rounded text-xs">SEO;PPC;GEO</code></p>
            <p className="mt-1">Company must be exactly: <code className="bg-blue-100 px-1 rounded text-xs">ThinkEngine Marketing</code>, <code className="bg-blue-100 px-1 rounded text-xs">ThinkEngine Tech</code>, or <code className="bg-blue-100 px-1 rounded text-xs">Cogs</code></p>
            <button onClick={downloadTemplate} className="mt-2 text-blue-600 underline text-xs font-medium">Download template CSV</button>
          </div>

          <div className="space-y-1">
            <Label>Paste CSV data here</Label>
            <Textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setPreview(null); setResult(null); }}
              placeholder={CSV_TEMPLATE}
              className="font-mono text-xs h-48"
            />
          </div>

          <Button type="button" variant="outline" onClick={handleParse} disabled={!csvText.trim()}>
            Preview Import
          </Button>

          {preview && (
            <div className="space-y-3">
              {preview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1 text-red-700 font-medium text-sm"><AlertCircle className="w-4 h-4" /> Errors found</div>
                  {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}

              {preview.rows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">
                    Ready to import <Badge className="bg-teal-100 text-teal-700 ml-1">{preview.rows.length} rows</Badge>
                  </p>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500">Name</th>
                          <th className="text-left px-3 py-2 text-slate-500">Brand</th>
                          <th className="text-left px-3 py-2 text-slate-500">Agreement</th>
                          <th className="text-left px-3 py-2 text-slate-500">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 font-medium">{r.name}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.company}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.agreement_type || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${result.failed === 0 ? "bg-green-50 border border-green-200 text-green-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
              <CheckCircle className="w-4 h-4" />
              Imported {result.success} clients successfully{result.failed > 0 ? `, ${result.failed} failed` : ""}.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Close</Button>
            {preview?.rows?.length > 0 && !result && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Upload className="w-4 h-4 mr-1" />
                {importing ? "Importing..." : `Import ${preview.rows.length} Clients`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}