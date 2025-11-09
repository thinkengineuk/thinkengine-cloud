import React, { useState, useEffect, useCallback } from "react";
import { Checklist } from "@/entities/Checklist";
import { ChecklistItem } from "@/entities/ChecklistItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
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

// Function to detect and linkify URLs in text
const LinkifiedText = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default function TaskChecklists({ taskId }) {
  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState("");
  const [deletingChecklist, setDeletingChecklist] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  const loadChecklists = useCallback(async () => {
    const taskChecklists = await Checklist.filter({ task_id: taskId }, "position");
    const checklistsWithItems = await Promise.all(
      taskChecklists.map(async (checklist) => {
        const items = await ChecklistItem.filter({ checklist_id: checklist.id }, "position");
        return { ...checklist, items };
      })
    );
    setChecklists(checklistsWithItems);
  }, [taskId]);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    
    await Checklist.create({
      task_id: taskId,
      title: newChecklistTitle,
      position: checklists.length,
    });
    
    setNewChecklistTitle("");
    setShowNewChecklist(false);
    loadChecklists();
  };

  const handleAddItem = async (checklistId, text) => {
    if (!text.trim()) return;
    
    const checklist = checklists.find(c => c.id === checklistId);
    await ChecklistItem.create({
      checklist_id: checklistId,
      text: text,
      completed: false,
      position: checklist.items.length,
    });
    
    loadChecklists();
  };

  const handleToggleItem = async (item) => {
    await ChecklistItem.update(item.id, { completed: !item.completed });
    loadChecklists();
  };

  const handleEditItem = (item) => {
    setEditingItem(item.id);
    setEditItemText(item.text);
  };

  const handleSaveEdit = async () => {
    if (!editItemText.trim()) return;
    
    await ChecklistItem.update(editingItem, { text: editItemText });
    setEditingItem(null);
    setEditItemText("");
    loadChecklists();
  };

  const handleDeleteChecklist = async () => {
    if (!deletingChecklist) return;
    
    const checklist = checklists.find(c => c.id === deletingChecklist);
    for (const item of checklist.items) {
      await ChecklistItem.delete(item.id);
    }
    await Checklist.delete(deletingChecklist);
    
    setDeletingChecklist(null);
    loadChecklists();
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    
    await ChecklistItem.delete(deletingItem);
    setDeletingItem(null);
    loadChecklists();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Checklists</h3>
        </div>
        {!showNewChecklist && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewChecklist(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Checklist
          </Button>
        )}
      </div>

      {showNewChecklist && (
        <div className="flex gap-2">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddChecklist()}
            placeholder="Checklist title..."
            autoFocus
          />
          <Button onClick={handleAddChecklist}>Add</Button>
          <Button variant="ghost" onClick={() => setShowNewChecklist(false)}>Cancel</Button>
        </div>
      )}

      {checklists.map((checklist) => {
        const completedCount = checklist.items.filter(i => i.completed).length;
        const totalCount = checklist.items.length;
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        return (
          <div key={checklist.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900">{checklist.title}</h4>
                  <span className="text-sm text-slate-500">
                    {completedCount}/{totalCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingChecklist(checklist.id)}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {checklist.items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => handleToggleItem(item)}
                    className="mt-1"
                  />
                  {editingItem === item.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editItemText}
                        onChange={(e) => setEditItemText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-slate-500' : 'text-slate-700'}`}>
                        <LinkifiedText text={item.text} />
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="w-3 h-3 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingItem(item.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <ChecklistItemInput
                checklistId={checklist.id}
                onAdd={handleAddItem}
              />
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!deletingChecklist} onOpenChange={(open) => !open && setDeletingChecklist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checklist and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChecklist} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this checklist item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChecklistItemInput({ checklistId, onAdd }) {
  const [text, setText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(checklistId, text);
      setText("");
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start text-slate-600 hover:bg-slate-50"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add item
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Add item..."
        autoFocus
        className="flex-1"
      />
      <Button size="sm" onClick={handleAdd}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
    </div>
  );
}