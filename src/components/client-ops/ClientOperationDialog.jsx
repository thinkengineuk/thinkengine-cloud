import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const ALL_SERVICES = [
  "SEO", "PPC", "Website Management", "Email & Automation",
  "Social Media", "Creative Design", "Chatbot Management",
  "Strategy, Consulting & Advisory", "Technology Management (inc Cogs)",
];

const USER_ROLES = ["client_lead", "client_exec", "client_exec_2", "website_creative", "tech_lead"];
const ROLE_LABELS = {
  client_lead: "Client Lead",
  client_exec: "Client Exec",
  client_exec_2: "Client Exec 2",
  website_creative: "Website & Creative",
  tech_lead: "Tech",
};

export default function ClientOperationDialog({ open, onOpenChange, project, users, onSaved }) {
  const isEdit = !!project;
  const [form, setForm] = useState({
    name: project?.name || "",
    company: project?.company || "ThinkEngine",
    client_type: project?.client_type || "Retained",
    agreement_type: project?.agreement_type || "",
    services: project?.services || [],
    client_lead: project?.client_lead || "",
    client_exec: project?.client_exec || "",
    client_exec_2: project?.client_exec_2 || "",
    website_creative: project?.website_creative || "",
    tech_lead: project?.tech_lead || "",
    current_stage: project?.current_stage || "Part 1 - Client Requirements Call",
  });
  const [saving, setSaving] = useState(false);

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
          <DialogTitle>{isEdit ? "Edit Client Operation" : "Add Client Operation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label>Company Name</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Ltd" />
            </div>
            <div className="space-y-1">
              <Label>ThinkEngine / Cogs</Label>
              <Select value={form.company} onValueChange={v => setForm({ ...form, company: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
                  <SelectItem value="Cogs">Cogs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Agreement Type</Label>
              <Select value={form.agreement_type} onValueChange={v => setForm({ ...form, agreement_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Monthly Rolling">Monthly Rolling</SelectItem>
                  <SelectItem value="3 Months (Quarterly)">3 Months (Quarterly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Services</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_SERVICES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    form.services.includes(s)
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-teal-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {USER_ROLES.map(role => (
              <div key={role} className="space-y-1">
                <Label>{ROLE_LABELS[role]}</Label>
                <Select value={form[role] || "none"} onValueChange={v => setForm({ ...form, [role]: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">–</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}