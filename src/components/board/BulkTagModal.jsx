import React, { useState } from "react";
import { Task } from "@/entities/Task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const getTagColor = (tag) => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-teal-100 text-teal-700 border-teal-200',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function BulkTagModal({ open, onOpenChange, selectedTasks, allTags, onComplete }) {
  const [tagInput, setTagInput] = useState("");
  const [tagsToAdd, setTagsToAdd] = useState([]);
  const [applying, setApplying] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = allTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tagsToAdd.includes(t)
  );

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !tagsToAdd.includes(trimmed)) {
      setTagsToAdd(prev => [...prev, trimmed]);
    }
    setTagInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag) => {
    setTagsToAdd(prev => prev.filter(t => t !== tag));
  };

  const handleApply = async () => {
    if (tagsToAdd.length === 0) return;
    setApplying(true);
    try {
      for (const task of selectedTasks) {
        const currentTags = task.tags || [];
        const newTags = [...new Set([...currentTags, ...tagsToAdd])];
        await Task.update(task.id, { tags: newTags });
      }
      onComplete();
      onOpenChange(false);
      setTagsToAdd([]);
      setTagInput("");
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setTagsToAdd([]);
    setTagInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Bulk Add Tags
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-600">
            Adding tags to <strong>{selectedTasks.length}</strong> selected task{selectedTasks.length !== 1 ? 's' : ''}.
          </p>

          {/* Tags to add */}
          {tagsToAdd.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagsToAdd.map(tag => (
                <Badge key={tag} className={`${getTagColor(tag)} border flex items-center gap-1`}>
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="relative">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Type a tag name..."
                onFocus={() => setShowSuggestions(tagInput.length > 0)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!tagInput.trim()}
                onClick={() => addTag(tagInput)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map(tag => (
                  <div
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <Badge className={`${getTagColor(tag)} border text-xs`}>{tag}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={tagsToAdd.length === 0 || applying}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
          >
            {applying ? 'Applying...' : `Apply to ${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}