import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Upload, Sparkles } from "lucide-react";

const KNOWN_SERVICES = [
  "SEO", "PPC", "GEO", "Website Management", "Email & Automation",
  "Social Media", "Strategy, Consulting & Advisory",
  "Technology Management (inc Cogs)", "Creative Design", "Chatbot Management",
];

const KNOWN_NAMES = ["Chloe", "Tom", "Emma", "Josh", "Karl", "Keara", "Ben"];

const AGREEMENT_MAP = {
  "annual": "12 Months",
  "12 months": "12 Months",
  "monthly rolling": "1 Month (Monthly Rolling)",
  "1 month": "1 Month (Monthly Rolling)",
  "monthly": "1 Month (Monthly Rolling)",
  "3 months": "3 Months (Quarterly)",
  "quarterly": "3 Months (Quarterly)",
  "6 months": "6 Months",
  "24 months": "24 Months",
  "36 months": "36 Months",
};

// Extract services from a concatenated string like "SEOPPCGEOWebsite ManagementEmail & Automation"
function extractServices(raw) {
  if (!raw || raw === "-") return [];
  const found = [];
  // Try to greedily match known services from left to right
  let remaining = raw;
  // Sort by length descending to match longer ones first
  const sorted = [...KNOWN_SERVICES].sort((a, b) => b.length - a.length);
  for (const svc of sorted) {
    if (remaining.includes(svc)) {
      found.push(svc);
      remaining = remaining.split(svc).join(" ");
    }
  }
  return found;
}

// Parse a name or "-" to clean value
function parseName(val) {
  if (!val || val.trim() === "-" || val.trim() === "") return "";
  return val.trim();
}

function normaliseAgreement(raw) {
  if (!raw || raw === "-") return "";
  const key = raw.toLowerCase().trim();
  return AGREEMENT_MAP[key] || raw;
}

// Parse tab-separated rows (copied from spreadsheet)
// Expected columns: Company | Agreement | (Project checkbox col?) | Services | Client Lead | Client Exec | Client Exec 2 | Website & Creative | Tech | (Actions)
function parseTabData(text, defaultCompany) {
  const lines = text.trim().split("\n").map(l => l.trimEnd()).filter(Boolean);
  const rows = [];
  const errors = [];

  // Detect if first line is a header row (contains "Company" or "Agreement")
  let startIdx = 0;
  if (lines[0] && (lines[0].toLowerCase().includes("company") || lines[0].toLowerCase().includes("agreement"))) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split("\t").map(c => c.trim());

    // Need at least a company name
    const name = cols[0];
    if (!name || name === "-" || name.toLowerCase() === "company") continue;

    // col[1] = Agreement
    const agreement_type = normaliseAgreement(cols[1] || "");

    // col[2] might be a checkbox/project indicator or could be services
    // Detect: if col[2] looks like a service string (contains known service names), skip project col
    // Otherwise col[2] = project flag, col[3] = services
    let serviceRaw = "";
    let isProject = false;
    let staffOffset = 0;

    const col2 = cols[2] || "";
    const col3 = cols[3] || "";

    // Check if col[2] looks like a boolean/checkbox (true/false/checked/empty tick)
    const looksLikeCheckbox = ["true", "false", "yes", "no", "✓", "✗", "", "project"].includes(col2.toLowerCase());

    if (looksLikeCheckbox) {
      isProject = ["true", "yes", "✓", "project"].includes(col2.toLowerCase());
      serviceRaw = col3;
      staffOffset = 4;
    } else {
      serviceRaw = col2;
      staffOffset = 3;
    }

    const services = extractServices(serviceRaw);

    // Staff: Client Lead, Client Exec, Client Exec 2, Website & Creative, Tech
    const client_lead = parseName(cols[staffOffset] || "");
    const client_exec = parseName(cols[staffOffset + 1] || "");
    const client_exec_2 = parseName(cols[staffOffset + 2] || "");
    const website_creative = parseName(cols[staffOffset + 3] || "");
    const tech_lead = parseName(cols[staffOffset + 4] || "");

    rows.push({
      name,
      company: defaultCompany,
      agreement_type,
      client_type: isProject ? "Project" : "Retained",
      services,
      client_lead,
      client_exec,
      client_exec_2,
      website_creative,
      tech_lead,
      how_to_use_link: "",
      current_stage: "Part 1 - Client Requirements Call",
      stage_started_at: { "Part 1 - Client Requirements Call": new Date().toISOString().slice(0, 10) },
      start_date: new Date().toISOString().slice(0, 10),
    });
  }

  return { rows, errors };
}

export default function BulkImportDialog({ open, onOpenChange, onImported }) {
  const [pasteText, setPasteText] = useState("");
  const [defaultCompany, setDefaultCompany] = useState("ThinkEngine Marketing");
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleParse = () => {
    const { rows, errors } = parseTabData(pasteText, defaultCompany);
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
    setPasteText("");
    setPreview(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Clients</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">How to import</p>
            <p>Copy rows directly from your spreadsheet and paste below. Expected columns (tab-separated):</p>
            <p className="mt-1 font-mono text-xs bg-blue-100 rounded px-2 py-1">
              Company Name | Agreement | Services | Client Lead | Client Exec | Client Exec 2 | Web & Creative | Tech
            </p>
            <p className="mt-1">Staff fields accept first names or <code className="bg-blue-100 px-1 rounded">-</code> for empty. Services can be concatenated (e.g. <code className="bg-blue-100 px-1 rounded">SEOPPCWebsite Management</code>).</p>
          </div>

          {/* Default company selector */}
          <div className="space-y-1">
            <Label>Assign all rows to Company</Label>
            <Select value={defaultCompany} onValueChange={setDefaultCompany}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ThinkEngine Marketing">ThinkEngine Marketing</SelectItem>
                <SelectItem value="ThinkEngine Tech">ThinkEngine Tech</SelectItem>
                <SelectItem value="Cogs">Cogs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Paste spreadsheet data here</Label>
            <Textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPreview(null); setResult(null); }}
              placeholder={"Funding 4 Education\tAnnual\tSEOPPCGEOWebsite ManagementEmail & AutomationCreative Design\tChloe\tTom\t-\tEmma\tKarl\nKerswell Kids\tAnnual\tSEOWebsite ManagementGEO\tChloe\tTom\t-\tEmma\t-"}
              className="font-mono text-xs h-40"
            />
          </div>

          <Button type="button" variant="outline" onClick={handleParse} disabled={!pasteText.trim()}>
            <Sparkles className="w-4 h-4 mr-1" />
            Preview Import
          </Button>

          {preview && (
            <div className="space-y-3">
              {preview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1 text-red-700 font-medium text-sm">
                    <AlertCircle className="w-4 h-4" /> Errors found
                  </div>
                  {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}

              {preview.rows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">
                    Ready to import <Badge className="bg-teal-100 text-teal-700 ml-1">{preview.rows.length} rows</Badge>
                  </p>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500">Name</th>
                          <th className="text-left px-3 py-2 text-slate-500">Agreement</th>
                          <th className="text-left px-3 py-2 text-slate-500">Services</th>
                          <th className="text-left px-3 py-2 text-slate-500">Lead</th>
                          <th className="text-left px-3 py-2 text-slate-500">Exec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 font-medium">{r.name}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.agreement_type || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.services.join(", ") || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_lead || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_exec || "–"}</td>
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
              <Button onClick={handleImport} disabled={importing} className="bg-teal-600 hover:bg-teal-700 text-white">
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