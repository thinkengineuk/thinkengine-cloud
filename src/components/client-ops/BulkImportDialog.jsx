import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Upload, Sparkles } from "lucide-react";

// All known tokens - ORDER MATTERS: longer/more specific first
const KNOWN_SERVICES = [
  "Strategy, Consulting & Advisory",
  "Technology Management (inc Cogs)",
  "Email & Automation",
  "Website Management",
  "Creative Design",
  "Chatbot Management",
  "Social Media",
  "SEO", "PPC", "GEO",
];

const KNOWN_AGREEMENTS = [
  "1 Month (Monthly Rolling)",
  "3 Months (Quarterly)",
  "Monthly Rolling",
  "6 Months",
  "12 Months",
  "24 Months",
  "36 Months",
  "Annual",
];

// Staff names known in the system
const KNOWN_NAMES = ["Ben", "Chloe", "Emma", "Josh", "Karl", "Keara", "Tom"];

/**
 * Parse a single row string like:
 * "Kerswell KidsAnnualSEOWebsite ManagementGEOChloeTom-Emma-"
 * into structured fields.
 */
function parseRow(raw) {
  let remaining = raw.trim();

  // 1. Extract agreement (find first match)
  let agreement_type = "";
  for (const ag of KNOWN_AGREEMENTS) {
    const idx = remaining.indexOf(ag);
    if (idx !== -1) {
      // Company name is everything before the agreement
      const name = remaining.slice(0, idx).trim();
      remaining = remaining.slice(idx + ag.length);
      agreement_type = ag === "Annual" ? "12 Months" : ag === "Monthly Rolling" ? "1 Month (Monthly Rolling)" : ag;

      // 2. Extract services
      const services = [];
      for (const svc of KNOWN_SERVICES) {
        const si = remaining.indexOf(svc);
        if (si !== -1) {
          services.push(svc);
          remaining = remaining.slice(0, si) + remaining.slice(si + svc.length);
        }
      }
      remaining = remaining.trim();

      // 3. Extract staff - split on known names and dashes
      // remaining should look like: "ChloeTom-Emma-" or "Chloe-Josh--Emma-"
      const staffTokens = tokeniseStaff(remaining);

      return {
        name,
        agreement_type,
        services,
        client_lead: staffTokens[0] || "",
        client_exec: staffTokens[1] || "",
        client_exec_2: staffTokens[2] || "",
        website_creative: staffTokens[3] || "",
        tech_lead: staffTokens[4] || "",
      };
    }
  }

  // No agreement found — try to extract name by looking for first known name or service
  // Find earliest split point
  let splitIdx = remaining.length;
  for (const name of KNOWN_NAMES) {
    const i = remaining.indexOf(name);
    if (i !== -1 && i < splitIdx) splitIdx = i;
  }
  for (const svc of KNOWN_SERVICES) {
    const i = remaining.indexOf(svc);
    if (i !== -1 && i < splitIdx) splitIdx = i;
  }

  const name = remaining.slice(0, splitIdx).trim();
  remaining = remaining.slice(splitIdx);

  const services = [];
  for (const svc of KNOWN_SERVICES) {
    const si = remaining.indexOf(svc);
    if (si !== -1) {
      services.push(svc);
      remaining = remaining.slice(0, si) + remaining.slice(si + svc.length);
    }
  }
  remaining = remaining.trim();
  const staffTokens = tokeniseStaff(remaining);

  return {
    name,
    agreement_type: "",
    services,
    client_lead: staffTokens[0] || "",
    client_exec: staffTokens[1] || "",
    client_exec_2: staffTokens[2] || "",
    website_creative: staffTokens[3] || "",
    tech_lead: staffTokens[4] || "",
  };
}

/**
 * Split a string like "ChloeTom-Emma-" or "Chloe-Josh--Emma-" into 5 staff slots.
 * Dashes represent empty slots.
 */
function tokeniseStaff(str) {
  // Insert separators before each known name
  let tagged = str;
  for (const name of KNOWN_NAMES) {
    tagged = tagged.split(name).join(`|${name}`);
  }
  // Split on | and -
  const parts = tagged.split(/[|]/).map(p => p.trim()).filter((p, i) => i > 0 || p !== "");

  const slots = [];
  for (const part of parts) {
    // Each part might be "Name---" or "Name-" or "-"
    const subparts = part.split("-");
    const name = subparts[0].trim();
    slots.push(name || "");
    // Each subsequent dash = empty slot
    for (let i = 1; i < subparts.length; i++) {
      if (subparts[i].trim() === "") slots.push("");
    }
  }

  // Pad to 5
  while (slots.length < 5) slots.push("");
  return slots.slice(0, 5);
}

/**
 * Split pasted text into individual row strings.
 * Rows are separated by double newlines OR by a new line that starts with a known company pattern.
 */
function splitIntoRows(text) {
  // Try tab-separated first (proper spreadsheet paste)
  if (text.includes("\t")) {
    return text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  }

  // Otherwise, split on blank lines
  const blocks = text.trim().split(/\n\s*\n/).map(b => b.replace(/\n/g, " ").trim()).filter(Boolean);
  return blocks;
}

function parseAll(text, defaultCompany) {
  const rawRows = splitIntoRows(text);
  const rows = [];
  const errors = [];

  // Skip header row if present
  const headerKeywords = ["company", "agreement", "services", "client lead", "actions"];
  const filtered = rawRows.filter(r => !headerKeywords.some(k => r.toLowerCase().startsWith(k)));

  for (const raw of filtered) {
    if (!raw.trim()) continue;

    // If tab-separated, split directly
    if (raw.includes("\t")) {
      const cols = raw.split("\t").map(c => c.trim());
      const name = cols[0];
      if (!name) continue;

      const agreement_type = normaliseAgreement(cols[1] || "");
      // col[2] might be project checkbox or start of services
      let serviceRaw = "";
      let staffStart = 3;
      const col2 = (cols[2] || "").toLowerCase();
      if (["true", "false", "yes", "no", "✓", "✗", "", "project"].includes(col2)) {
        serviceRaw = cols[3] || "";
        staffStart = 4;
      } else {
        serviceRaw = cols[2] || "";
        staffStart = 3;
      }

      const services = extractServicesFromTabbed(serviceRaw);
      const staff = cols.slice(staffStart, staffStart + 5).map(v => (v === "-" ? "" : v.trim()));

      rows.push({
        name, company: defaultCompany, agreement_type,
        client_type: "Retained", services,
        client_lead: staff[0] || "", client_exec: staff[1] || "",
        client_exec_2: staff[2] || "", website_creative: staff[3] || "",
        tech_lead: staff[4] || "", how_to_use_link: "",
        current_stage: "Part 1 - Client Requirements Call",
        stage_started_at: { "Part 1 - Client Requirements Call": new Date().toISOString().slice(0, 10) },
        start_date: new Date().toISOString().slice(0, 10),
      });
    } else {
      // Space-concatenated format
      const parsed = parseRow(raw);
      if (!parsed.name) { errors.push(`Could not parse row: "${raw.slice(0, 40)}..."`); continue; }
      rows.push({
        ...parsed,
        company: defaultCompany,
        client_type: "Retained",
        how_to_use_link: "",
        current_stage: "Part 1 - Client Requirements Call",
        stage_started_at: { "Part 1 - Client Requirements Call": new Date().toISOString().slice(0, 10) },
        start_date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  return { rows, errors };
}

function extractServicesFromTabbed(raw) {
  if (!raw || raw === "-") return [];
  const found = [];
  let remaining = raw;
  for (const svc of KNOWN_SERVICES) {
    if (remaining.includes(svc)) {
      found.push(svc);
      remaining = remaining.split(svc).join(" ");
    }
  }
  return found;
}

function normaliseAgreement(raw) {
  if (!raw || raw === "-") return "";
  const key = raw.toLowerCase().trim();
  const map = {
    "annual": "12 Months",
    "12 months": "12 Months",
    "monthly rolling": "1 Month (Monthly Rolling)",
    "1 month (monthly rolling)": "1 Month (Monthly Rolling)",
    "1 month": "1 Month (Monthly Rolling)",
    "monthly": "1 Month (Monthly Rolling)",
    "3 months (quarterly)": "3 Months (Quarterly)",
    "3 months": "3 Months (Quarterly)",
    "quarterly": "3 Months (Quarterly)",
    "6 months": "6 Months",
    "24 months": "24 Months",
    "36 months": "36 Months",
  };
  return map[key] || raw;
}

export default function BulkImportDialog({ open, onOpenChange, onImported }) {
  const [pasteText, setPasteText] = useState("");
  const [defaultCompany, setDefaultCompany] = useState("ThinkEngine Marketing");
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleParse = () => {
    const { rows, errors } = parseAll(pasteText, defaultCompany);
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
            <p>Copy rows from your spreadsheet and paste below. Each client should be on its own line (or separated by a blank line). Columns:</p>
            <p className="mt-1 font-mono text-xs bg-blue-100 rounded px-2 py-1">
              Company | Agreement | Services | Client Lead | Client Exec | Client Exec 2 | Web & Creative | Tech
            </p>
            <p className="mt-1 text-xs">Use <code className="bg-blue-100 px-1 rounded">-</code> for empty staff slots. Services will be automatically detected.</p>
          </div>

          <div className="space-y-1">
            <Label>Assign all rows to Company</Label>
            <Select value={defaultCompany} onValueChange={setDefaultCompany}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
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
              placeholder={"Kerswell Kids\tAnnual\tSEOWebsite ManagementGEO\tChloe\tTom\t-\tEmma\t-"}
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
                    <AlertCircle className="w-4 h-4" /> Issues found
                  </div>
                  {preview.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}

              {preview.rows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">
                    Ready to import <Badge className="bg-teal-100 text-teal-700 ml-1">{preview.rows.length} rows</Badge>
                  </p>
                  <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 w-36">Name</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-24">Agreement</th>
                          <th className="text-left px-3 py-2 text-slate-500">Services</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-16">Lead</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-16">Exec</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-16">Exec 2</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-16">Web</th>
                          <th className="text-left px-3 py-2 text-slate-500 w-16">Tech</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium">{r.name}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.agreement_type || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.services.join(", ") || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_lead || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_exec || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.client_exec_2 || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.website_creative || "–"}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.tech_lead || "–"}</td>
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