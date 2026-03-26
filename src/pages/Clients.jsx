import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("ThinkEngine");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [u, c] = await Promise.all([base44.auth.me(), base44.entities.Client.list("name")]);
    setUser(u);
    setClients(c);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" /></div>;
  if (user?.role !== "admin") return <div className="p-8 text-center text-slate-500">Admin access required.</div>;

  const filtered = clients.filter(c => filterCompany === "all" || c.company === filterCompany);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await base44.entities.Client.create({ name: newName.trim(), company: newCompany });
    setNewName("");
    toast({ title: "Client added" });
    loadAll();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    await base44.entities.Client.delete(id);
    toast({ title: "Client deleted" });
    loadAll();
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    await base44.entities.Client.update(id, { name: editName.trim() });
    setEditingId(null);
    toast({ title: "Client updated" });
    loadAll();
  };

  const thinkEngineClients = filtered.filter(c => c.company === "ThinkEngine");
  const cogsClients = filtered.filter(c => c.company === "Cogs");

  const ClientRow = ({ client }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 group">
      {editingId === client.id ? (
        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1 mr-2" autoFocus onKeyDown={e => e.key === "Enter" && handleEdit(client.id)} />
      ) : (
        <span className="text-sm text-slate-800">{client.name}</span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editingId === client.id ? (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(client.id)}><Check className="w-3.5 h-3.5 text-green-600" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5 text-slate-500" /></Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(client.id); setEditName(client.name); }}><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(client.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client List</h1>
        <p className="text-sm text-slate-500">Manage the clients available when creating projects.</p>
      </div>

      {/* Add new client */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-700">Add New Client</h2>
        <div className="flex gap-3">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Client name" onKeyDown={e => e.key === "Enter" && handleAdd()} className="flex-1" />
          <Select value={newCompany} onValueChange={setNewCompany}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
              <SelectItem value="Cogs">Cogs</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "ThinkEngine", "Cogs"].map(opt => (
          <button key={opt} onClick={() => setFilterCompany(opt)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${filterCompany === opt ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}>
            {opt === "all" ? "All" : opt}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(filterCompany === "all" || filterCompany === "ThinkEngine") && thinkEngineClients.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-2">ThinkEngine <span className="text-slate-400 font-normal text-sm">({thinkEngineClients.length})</span></h3>
            {thinkEngineClients.map(c => <ClientRow key={c.id} client={c} />)}
          </div>
        )}
        {(filterCompany === "all" || filterCompany === "Cogs") && cogsClients.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-700 mb-2">Cogs <span className="text-slate-400 font-normal text-sm">({cogsClients.length})</span></h3>
            {cogsClients.map(c => <ClientRow key={c.id} client={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}