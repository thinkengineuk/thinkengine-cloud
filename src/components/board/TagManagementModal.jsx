
import React, { useState, useEffect, useCallback } from "react";
import { Task } from "@/entities/Task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Pencil, Trash2, Plus, X, Check, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const tagColorOptions = [
  { value: 'blue', class: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Blue' },
  { value: 'purple', class: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Purple' },
  { value: 'green', class: 'bg-green-100 text-green-700 border-green-200', label: 'Green' },
  { value: 'orange', class: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Orange' },
  { value: 'pink', class: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Pink' },
  { value: 'cyan', class: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Cyan' },
  { value: 'indigo', class: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Indigo' },
  { value: 'teal', class: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Teal' },
  { value: 'red', class: 'bg-red-100 text-red-700 border-red-200', label: 'Red' },
  { value: 'yellow', class: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Yellow' },
];

// Function to generate consistent color for a tag (fallback)
const getTagColor = (tag, customColors = {}) => {
  if (customColors[tag]) {
    const colorOption = tagColorOptions.find(c => c.value === customColors[tag]);
    return colorOption ? colorOption.class : tagColorOptions[0].class;
  }
  
  // Fallback to hash-based color
  const colors = tagColorOptions.map(c => c.class);
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function TagManagementModal({ boardId, open, onOpenChange, onRefresh }) {
  const [allTags, setAllTags] = useState([]);
  const [tagUsageCount, setTagUsageCount] = useState({});
  const [tagColors, setTagColors] = useState({});
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [editingTag, setEditingTag] = useState(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("blue");
  const [deletingTag, setDeletingTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewTagSuggestions, setShowNewTagSuggestions] = useState(false);

  const loadTags = useCallback(async () => {
    try {
      const tasksData = await Task.filter({ board_id: boardId });
      
      const tagsSet = new Set();
      const usageCount = {};
      const colors = {};
      
      tasksData.forEach(task => {
        if (task.tags) {
          task.tags.forEach(tag => {
            tagsSet.add(tag);
            usageCount[tag] = (usageCount[tag] || 0) + 1;
          });
        }
        // Load custom tag colors if stored
        if (task.tag_colors) {
          Object.assign(colors, task.tag_colors);
        }
      });
      
      setAllTags(Array.from(tagsSet).sort());
      setTagUsageCount(usageCount);
      setTagColors(colors);
    } catch (error) {
      console.error("Error loading tags:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, loadTags]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    
    const trimmedName = newTagName.trim();
    
    // Check if tag already exists
    if (allTags.includes(trimmedName)) {
      alert("This tag already exists!");
      return;
    }
    
    setAllTags(prev => [...prev, trimmedName].sort());
    setTagColors(prev => ({ ...prev, [trimmedName]: newTagColor }));
    setNewTagName("");
    setNewTagColor("blue");
    setShowNewTagSuggestions(false);
  };

  const selectExistingTag = (tag) => {
    setNewTagName(tag);
    setShowNewTagSuggestions(false);
  };

  const filteredNewTagSuggestions = allTags.filter(tag => 
    tag.toLowerCase().includes(newTagName.toLowerCase())
  );

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setEditTagName(tag);
    setEditTagColor(tagColors[tag] || "blue");
  };

  const handleSaveEdit = async () => {
    if (!editTagName.trim() || (editTagName === editingTag && editTagColor === tagColors[editingTag])) {
      setEditingTag(null);
      return;
    }

    try {
      const tasksData = await Task.filter({ board_id: boardId });
      
      for (const task of tasksData) {
        let needsUpdate = false;
        let updates = {};

        // Update tag name if changed
        if (editTagName !== editingTag && task.tags && task.tags.includes(editingTag)) {
          const updatedTags = task.tags.map(t => t === editingTag ? editTagName.trim() : t);
          updates.tags = updatedTags;
          needsUpdate = true;
        }

        // Update tag color
        const currentColors = task.tag_colors || {};
        if (editTagName !== editingTag) {
          // Remove old tag color, add new one
          delete currentColors[editingTag];
          currentColors[editTagName] = editTagColor;
          updates.tag_colors = currentColors;
          needsUpdate = true;
        } else if (currentColors[editingTag] !== editTagColor) {
          // Just update color
          currentColors[editingTag] = editTagColor;
          updates.tag_colors = currentColors;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Task.update(task.id, updates);
        }
      }

      setEditingTag(null);
      setEditTagName("");
      setEditTagColor("blue");
      loadTags();
      onRefresh();
    } catch (error) {
      alert("Failed to edit tag: " + error.message);
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    try {
      const tasksData = await Task.filter({ board_id: boardId });
      
      for (const task of tasksData) {
        if (task.tags && task.tags.includes(deletingTag)) {
          const updatedTags = task.tags.filter(t => t !== deletingTag);
          const updatedColors = { ...(task.tag_colors || {}) };
          delete updatedColors[deletingTag];
          
          await Task.update(task.id, { 
            tags: updatedTags,
            tag_colors: updatedColors
          });
        }
      }

      setDeletingTag(null);
      await loadTags();
      onRefresh();
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag: " + error.message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Tag className="w-6 h-6" />
              Manage Tags
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add New Tag */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Add New Tag</h3>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => {
                      setNewTagName(e.target.value);
                      setShowNewTagSuggestions(e.target.value.length > 0);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Enter tag name..."
                    className="flex-1"
                    onFocus={() => setShowNewTagSuggestions(newTagName.length > 0)}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Palette className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <div className="grid grid-cols-5 gap-2">
                        {tagColorOptions.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setNewTagColor(color.value)}
                            className={`w-8 h-8 rounded border-2 ${color.class} ${
                              newTagColor === color.value ? 'ring-2 ring-slate-400' : ''
                            }`}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </Button>
                </div>
                
                {showNewTagSuggestions && filteredNewTagSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredNewTagSuggestions.map((tag) => (
                      <div
                        key={tag}
                        onClick={() => selectExistingTag(tag)}
                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm flex items-center gap-2"
                      >
                        <Badge className={`${getTagColor(tag, tagColors)} border`}>
                          {tag}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          (Used in {tagUsageCount[tag] || 0} task{tagUsageCount[tag] !== 1 ? 's' : ''})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Existing Tags */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Existing Tags ({allTags.length})</h3>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading tags...</div>
              ) : allTags.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No tags yet. Add your first tag above.
                </div>
              ) : (
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {allTags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        {editingTag === tag ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editTagName}
                              onChange={(e) => setEditTagName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                              className="flex-1"
                              autoFocus
                            />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0">
                                  <Palette className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3">
                                <div className="grid grid-cols-5 gap-2">
                                  {tagColorOptions.map((color) => (
                                    <button
                                      key={color.value}
                                      onClick={() => setEditTagColor(color.value)}
                                      className={`w-8 h-8 rounded border-2 ${color.class} ${
                                        editTagColor === color.value ? 'ring-2 ring-slate-400' : ''
                                      }`}
                                      title={color.label}
                                    />
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingTag(null)}>
                              <X className="w-4 h-4 text-slate-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 flex-1">
                              <Badge className={`${getTagColor(tag, tagColors)} border`}>
                                {tag}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                Used in {tagUsageCount[tag] || 0} task{tagUsageCount[tag] !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditTag(tag)}
                                className="h-8 w-8"
                              >
                                <Pencil className="w-4 h-4 text-slate-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletingTag(tag)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{deletingTag}"? This will remove it from all {tagUsageCount[deletingTag] || 0} task{tagUsageCount[deletingTag] !== 1 ? 's' : ''} that use it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
