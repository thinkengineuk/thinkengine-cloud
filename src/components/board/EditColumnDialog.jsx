import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const colors = [
  { value: 'blue', label: 'Blue', gradient: 'from-blue-400 to-blue-600' },
  { value: 'purple', label: 'Purple', gradient: 'from-purple-400 to-purple-600' },
  { value: 'green', label: 'Green', gradient: 'from-green-400 to-green-600' },
  { value: 'orange', label: 'Orange', gradient: 'from-orange-400 to-orange-600' },
  { value: 'pink', label: 'Pink', gradient: 'from-pink-400 to-pink-600' },
  { value: 'red', label: 'Red', gradient: 'from-red-400 to-red-600' },
  { value: 'teal', label: 'Teal', gradient: 'from-teal-400 to-teal-600' },
  { value: 'indigo', label: 'Indigo', gradient: 'from-indigo-400 to-indigo-600' },
  { value: 'cyan', label: 'Cyan', gradient: 'from-cyan-400 to-cyan-600' },
  { value: 'black', label: 'Black', gradient: 'from-slate-700 to-slate-900' },
];

export default function EditColumnDialog({ open, onOpenChange, column, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    color: "blue"
  });

  useEffect(() => {
    if (column) {
      setFormData({
        name: column.name,
        color: column.color || "blue"
      });
    }
  }, [column]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Column</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Column Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., To Do, In Progress"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Column Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-full aspect-square rounded-lg bg-gradient-to-br ${color.gradient} shadow-md hover:shadow-lg transition-all ${
                    formData.color === color.value ? 'ring-4 ring-offset-2 ring-blue-500' : ''
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}