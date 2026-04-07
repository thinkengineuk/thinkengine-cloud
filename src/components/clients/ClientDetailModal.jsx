import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function ClientDetailModal({ client, open, onOpenChange, onRefresh }) {
  const [name, setName] = useState(client?.name || "");
  const [company, setCompany] = useState(client?.company || "ThinkEngine");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (client) {
      setName(client.name);
      setCompany(client.company);
    }
  }, [client]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await base44.entities.Client.update(client.id, { name: name.trim(), company });
    toast({ title: "Client updated" });
    setSaving(false);
    onOpenChange(false);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Client Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Company</label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
                <SelectItem value="Cogs">Cogs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}