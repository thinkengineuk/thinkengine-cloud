import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

export default function ClientNameCombobox({ value, onChange, company }) {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    loadClients();
  }, [company]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const loadClients = async () => {
    const filter = company ? { company } : {};
    const all = await base44.entities.Client.filter(filter, "name");
    setClients(all);
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (name) => {
    setInputValue(name);
    onChange(name);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleAddNew = async () => {
    if (!inputValue.trim()) return;
    // Save new client to DB
    await base44.entities.Client.create({ name: inputValue.trim(), company: company || "ThinkEngine" });
    onChange(inputValue.trim());
    setOpen(false);
    loadClients();
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showAddNew = inputValue.trim() && !clients.some(c => c.name.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Select or type client name"
        />
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 && !showAddNew && (
            <p className="px-3 py-2 text-sm text-slate-500">No clients found</p>
          )}
          {filtered.map(c => (
            <div
              key={c.id}
              className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
              onMouseDown={() => handleSelect(c.name)}
            >
              {c.name}
            </div>
          ))}
          {showAddNew && (
            <div
              className="px-3 py-2 text-sm text-teal-600 font-medium hover:bg-teal-50 cursor-pointer border-t border-slate-100"
              onMouseDown={handleAddNew}
            >
              + Add "{inputValue.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}