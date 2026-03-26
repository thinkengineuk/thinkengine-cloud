import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COLORS = [
  { name: "blue", class: "bg-blue-500" },
  { name: "purple", class: "bg-purple-500" },
  { name: "green", class: "bg-green-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "pink", class: "bg-pink-500" },
  { name: "teal", class: "bg-teal-500" },
  { name: "indigo", class: "bg-indigo-500" },
  { name: "red", class: "bg-red-500" },
];

export default function CreateClientProjectDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    client_name: "",
    company: "ThinkEngine",
    client_type: "Project",
    description: "",
    start_date: new Date().toISOString().slice(0, 10),
    color: "blue",
    current_stage: "Project Commencement",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.ClientProject.create({
      ...form,
      stage_started_at: { "Project Commencement": form.start_date },
    });
    setSaving(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Client Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Project Name</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Website Redesign" />
            </div>
            <div className="space-y-1">
              <Label>Client Name</Label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. Acme Corp" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company</Label>
              <Select value={form.company} onValueChange={v => setForm({ ...form, company: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
                  <SelectItem value="Cogs">Cogs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Client Type</Label>
              <Select value={form.client_type} onValueChange={v => setForm({ ...form, client_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retained">Retained</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief project scope..." />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.name })}
                  className={`w-7 h-7 rounded-full ${c.class} transition-transform ${form.color === c.name ? "ring-2 ring-offset-2 ring-slate-500 scale-110" : ""}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}