import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X, Check, Search, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientOperationDialog from "@/components/client-ops/ClientOperationDialog";
import BulkImportDialog from "@/components/client-ops/BulkImportDialog";
import { useToast } from "@/components/ui/use-toast";

const SERVICE_COLORS = {
  "SEO": "bg-blue-100 text-blue-700",
  "PPC": "bg-purple-100 text-purple-700",
  "GEO": "bg-cyan-100 text-cyan-700",
  "Website Management": "bg-teal-100 text-teal-700",
  "Email & Automation": "bg-orange-100 text-orange-700",
  "Social Media": "bg-pink-100 text-pink-700",
  "Creative Design": "bg-yellow-100 text-yellow-700",
  "Chatbot Management": "bg-green-100 text-green-700",
  "Strategy, Consulting & Advisory": "bg-indigo-100 text-indigo-700",
  "Technology Management (inc Cogs)": "bg-slate-100 text-slate-700",
};

function firstName(email, users) {
  if (!email) return null;
  const u = users.find(u => u.email === email);
  const name = u?.full_name || email.split("@")[0];
  const first = name.split(" ")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function UserName({ email, users }) {
  const name = firstName(email, users);
  if (!name) return <span className="text-slate-400">–</span>;
  return <span className="text-slate-700 text-sm">{name}</span>;
}

export default function ClientOperations() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agreementFilter, setAgreementFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [me, allProjects, allUsers] = await Promise.all([
      base44.auth.me(),
      base44.entities.ClientProject.list("name"),
      base44.entities.User.list(),
    ]);
    setUser(me);
    setProjects(allProjects);
    setUsers(allUsers);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" /></div>;

  const isAdmin = user?.role === "admin";

  const STAFF_FIELDS = ["client_lead", "client_exec", "client_exec_2", "website_creative", "tech_lead"];

  // Only show users who are actually assigned to at least one project
  const assignedEmails = new Set(
    projects.flatMap(p => STAFF_FIELDS.map(f => p[f]).filter(Boolean))
  );
  const filteredUsers = users
    .filter(u => assignedEmails.has(u.email))
    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchAgreement = agreementFilter === "all" || p.agreement_type === agreementFilter;
    const matchPerson = personFilter === "all" || STAFF_FIELDS.some(f => p[f] === personFilter);
    const isRetained = p.client_type === "Retained";
    return matchSearch && matchAgreement && matchPerson && isRetained;
  });

  const teMarketingProjects = filtered.filter(p => p.company === "ThinkEngine Marketing");
  const teTechProjects = filtered.filter(p => p.company === "ThinkEngine Tech");
  const cogsProjects = filtered.filter(p => p.company === "Cogs");

  const handleDelete = async (id) => {
    await base44.entities.ClientProject.delete(id);
    setConfirmDeleteId(null);
    toast({ title: "Client operation deleted", duration: 2000 });
    loadAll();
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditing(null);
    loadAll();
  };

  const CompanyTable = ({ title, rows }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="bg-slate-100 text-slate-500 text-xs font-bold rounded-full px-2 py-0.5">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-48">Company</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-36">Agreement</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Services</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-24">Client Lead</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-24">Client Exec</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-24">Exec 2</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-28">Web & Creative</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-20">Tech</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-20">How-To</th>
              {isAdmin && <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-20">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="text-center text-slate-400 py-8 text-sm italic">No clients found</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-800">{p.name || p.client_name}</td>
                <td className="px-4 py-2.5">
                  {p.agreement_type ? (
                    <Badge className="text-xs font-medium bg-slate-100 text-slate-600">{p.agreement_type}</Badge>
                  ) : <span className="text-slate-400">–</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(p.services || []).map(s => (
                      <Badge key={s} className={`text-xs ${SERVICE_COLORS[s] || "bg-slate-100 text-slate-600"}`}>{s}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5"><UserName email={p.client_lead} users={users} /></td>
                <td className="px-4 py-2.5"><UserName email={p.client_exec} users={users} /></td>
                <td className="px-4 py-2.5"><UserName email={p.client_exec_2} users={users} /></td>
                <td className="px-4 py-2.5"><UserName email={p.website_creative} users={users} /></td>
                <td className="px-4 py-2.5"><UserName email={p.tech_lead} users={users} /></td>
                <td className="px-4 py-2.5">
                  {p.how_to_use_link ? (
                    <a href={p.how_to_use_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Link</a>
                  ) : <span className="text-slate-400">–</span>}
                </td>
                {isAdmin && (
                  <td className="px-4 py-2.5">
                    {confirmDeleteId === p.id ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(p.id)}><Check className="w-3.5 h-3.5 text-red-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDeleteId(null)}><X className="w-3.5 h-3.5 text-slate-400" /></Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-teal-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDeleteId(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Client Operations</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1" /> Bulk Import
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Client
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9" />
        </div>
        <Select value={personFilter} onValueChange={setPersonFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter by person" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All People</SelectItem>
            {filteredUsers.map(u => (
              <SelectItem key={u.id} value={u.email}>
                {u.full_name?.split(" ")[0] || u.email.split("@")[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agreementFilter} onValueChange={setAgreementFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Agreement Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agreement Types</SelectItem>
            <SelectItem value="1 Month (Monthly Rolling)">1 Month (Monthly Rolling)</SelectItem>
            <SelectItem value="3 Months (Quarterly)">3 Months (Quarterly)</SelectItem>
            <SelectItem value="6 Months">6 Months</SelectItem>
            <SelectItem value="12 Months">12 Months</SelectItem>
            <SelectItem value="24 Months">24 Months</SelectItem>
            <SelectItem value="36 Months">36 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          <p className="text-base font-medium mb-2">No client data</p>
          <p className="text-sm">Use the "Bulk Import" button to import your client operations data.</p>
        </div>
      ) : (
        <>
          {teMarketingProjects.length > 0 && <CompanyTable title="ThinkEngine Marketing" rows={teMarketingProjects} />}
          {teTechProjects.length > 0 && <CompanyTable title="ThinkEngine Tech" rows={teTechProjects} />}
          {cogsProjects.length > 0 && <CompanyTable title="Cogs" rows={cogsProjects} />}
        </>
      )}

      {dialogOpen && (
        <ClientOperationDialog
          open={dialogOpen}
          onOpenChange={v => { if (!v) { setDialogOpen(false); setEditing(null); } }}
          project={editing}
          users={users}
          onSaved={handleSaved}
        />
      )}

      {bulkImportOpen && (
        <BulkImportDialog
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          onImported={() => { setBulkImportOpen(false); loadAll(); }}
        />
      )}
    </div>
  );
}