import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_SERVICES = [
  "SEO", "PPC", "GEO", "Website Management", "Email & Automation",
  "Social Media", "Strategy, Consulting & Advisory",
  "Technology Management (inc Cogs)", "Creative Design", "Chatbot Management",
];

const COMPANIES = ["ThinkEngine Marketing", "ThinkEngine Tech", "Cogs"];

const AGREEMENT_OPTIONS = [
  "1 Month (Monthly Rolling)",
  "3 Months (Quarterly)",
  "6 Months",
  "12 Months",
  "24 Months",
  "36 Months",
];

const USER_ROLES = ["client_lead", "client_exec", "client_exec_2", "website_creative", "tech_lead"];
const ROLE_LABELS = {
  client_lead: "Client Lead",
  client_exec: "Client Exec",
  client_exec_2: "Client Exec 2",
  website_creative: "Website & Creative",
  tech_lead: "Tech",
};

function displayName(u) {
  if (!u) return "";
  const name = u.full_name || u.email;
  return name.split(" ")[0];
}

// Resolve a value that might be a first name or an email to an email
function resolveToEmail(value, users) {
  if (!value) return "";
  // Already an email
  if (value.includes("@")) return value;
  // Try to match by first name (case-insensitive)
  const match = users.find(u =>
    (u.full_name || "").split(" ")[0].toLowerCase() === value.toLowerCase()
  );
  return match?.email || value;
}

export default function ClientOperationDialog({ open, onOpenChange, project, users, onSaved }) {
  const isEdit = !!project;
  const [clients, setClients] = useState([]);

  const resolveStaff = (field) => resolveToEmail(project?.[field] || "", users);

  const [form, setForm] = useState({
    name: project?.name || "",
    company: project?.company || "ThinkEngine Marketing",
    client_type: project?.client_type || "Retained",
    agreement_type: project?.agreement_type || "",
    services: project?.services || [],
    client_lead: resolveStaff("client_lead"),
    client_exec: resolveStaff("client_exec"),
    client_exec_2: resolveStaff("client_exec_2"),
    website_creative: resolveStaff("website_creative"),
    tech_lead: resolveStaff("tech_lead"),
    how_to_use_link: project?.how_to_use_link || "",
    current_stage: project?.current_stage || "Part 1 - Client Requirements Call",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Client.list("name").then(setClients);
  }, []);

  const brandToCompany = {
    "ThinkEngine Marketing": "ThinkEngine",
    "ThinkEngine Tech": "ThinkEngine",
    "Cogs": "Cogs",
  };
  const filteredClients = clients.filter(c => c.company === brandToCompany[form.company]);

  const toggleService = (s) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (isEdit) {
      await base44.entities.ClientProject.update(project.id, form);
    } else {
      await base44.entities.ClientProject.create({
        ...form,
        stage_started_at: { [form.current_stage]: new Date().toISOString().slice(0, 10) },
        start_date: new Date().toISOString().slice(0, 10),
      });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client Operations" : "Add Client Operations"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Row 1: Company (brand) - full width, first */}
          <div className="space-y-1">
            <Label>Company</Label>
            <Select value={form.company} onValueChange={v => setForm({ ...form, company: v, name: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPANIES.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Company Name + Agreement Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company Name <span className="text-red-500">*</span></Label>
              <Select value={form.name} onValueChange={v => setForm({ ...form, name: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Agreement Type</Label>
              <Select value={form.agreement_type} onValueChange={v => setForm({ ...form, agreement_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {AGREEMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Staff roles in 2-col grid */}
          <div className="grid grid-cols-2 gap-4">
            {USER_ROLES.map(role => (
              <div key={role} className="space-y-1">
                <Label>{ROLE_LABELS[role]}</Label>
                <Select value={form[role] || "none"} onValueChange={v => setForm({ ...form, [role]: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{displayName(u)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-1">
              <Label>How-To-Use Link (Google Drive)</Label>
              <Input
                value={form.how_to_use_link}
                onChange={e => setForm({ ...form, how_to_use_link: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
              />
            </div>
          </div>

          {/* Project checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-project"
              checked={form.client_type === "Project"}
              onCheckedChange={checked => setForm({ ...form, client_type: checked ? "Project" : "Retained" })}
            />
            <label htmlFor="is-project" className="text-sm text-slate-700 cursor-pointer">
              <span className="font-medium">Project</span> <span className="text-slate-500">(one-off project, not a retainer)</span>
            </label>
          </div>

          {/* Services Provided */}
          <div className="space-y-2">
            <Label className="font-semibold">Services Provided</Label>
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-3 space-y-2">
              {ALL_SERVICES.map(s => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`svc-${s}`}
                    checked={form.services.includes(s)}
                    onCheckedChange={() => toggleService(s)}
                  />
                  <label htmlFor={`svc-${s}`} className="text-sm text-slate-700 cursor-pointer">{s}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Client Operations"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}