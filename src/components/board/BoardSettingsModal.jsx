import React, { useState, useEffect, useCallback } from "react";
import { Board } from "@/entities/Board";
import { User } from "@/entities/User";
import { Column } from "@/entities/Column";
import { Task } from "@/entities/Task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Trash2, UserPlus, Tag, X } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { removeDuplicateTasks } from "@/functions/removeDuplicateTasks";

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
];

export default function BoardSettingsModal({ boardId, open, onOpenChange, onRefresh }) {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    members: []
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [tagRestrictions, setTagRestrictions] = useState({}); // { userEmail: [tag, ...] }
  const [tagInputs, setTagInputs] = useState({}); // { userEmail: inputValue }

  const loadData = useCallback(async () => {
    try {
      const me = await User.me();
      setCurrentUser(me);

      const boardData = await Board.filter({ id: boardId });
      if (boardData.length > 0) {
        const b = boardData[0];
        setBoard(b);
        setFormData({
          name: b.name,
          description: b.description || "",
          color: b.color || "blue",
          members: b.members || []
        });
      }

      const allUsers = await User.list();
      setUsers(allUsers);

      // Load existing tag restrictions from user data
      const restrictions = {};
      allUsers.forEach(u => {
        if (u.board_tag_restrictions?.[boardId]) {
          restrictions[u.email] = u.board_tag_restrictions[boardId];
        }
      });
      setTagRestrictions(restrictions);

      // Load all tags from tasks
      const tasksData = await Task.filter({ board_id: boardId });
      const tagsSet = new Set();
      tasksData.forEach(task => (task.tags || []).forEach(t => tagsSet.add(t)));
      setAllTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleMemberToggle = (email) => {
    setFormData(prev => {
      const members = prev.members.includes(email)
        ? prev.members.filter(m => m !== email)
        : [...prev.members, email];
      return { ...prev, members };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Board.update(boardId, formData);

      // Save tag restrictions for each user
      const savePromises = users.map(async (user) => {
        const currentRestrictions = user.board_tag_restrictions || {};
        const newTags = tagRestrictions[user.email] || [];
        
        // Only update if changed
        const existing = currentRestrictions[boardId] || [];
        const changed = JSON.stringify(existing.sort()) !== JSON.stringify([...newTags].sort());
        
        if (changed) {
          const updatedRestrictions = { ...currentRestrictions };
          if (newTags.length > 0) {
            updatedRestrictions[boardId] = newTags;
          } else {
            delete updatedRestrictions[boardId];
          }
          await User.update(user.id, { board_tag_restrictions: updatedRestrictions });
        }
      });
      await Promise.all(savePromises);

      onOpenChange(false);
      onRefresh();
    } catch (error) {
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addTagRestriction = (email, tag) => {
    if (!tag.trim()) return;
    setTagRestrictions(prev => ({
      ...prev,
      [email]: [...new Set([...(prev[email] || []), tag.trim()])]
    }));
    setTagInputs(prev => ({ ...prev, [email]: '' }));
  };

  const removeTagRestriction = (email, tag) => {
    setTagRestrictions(prev => ({
      ...prev,
      [email]: (prev[email] || []).filter(t => t !== tag)
    }));
  };

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    
    // Set a maximum timeout of 3 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    try {
      // Try to delete just the board - let database handle cascades
      const deletePromise = Board.delete(boardId);
      
      // Race between deletion and timeout
      await Promise.race([deletePromise, timeoutPromise]);
      
    } catch (error) {
      console.warn('Board deletion warning:', error.message);
      // Continue anyway - board might be deleted even if we got an error
    }
    
    // Always close modal and navigate away
    onOpenChange(false);
    
    // Force immediate navigation using window.location
    window.location.href = createPageUrl("Dashboard");
  };

  const handleRemoveDuplicates = async () => {
    setCleaningDuplicates(true);
    try {
      const response = await removeDuplicateTasks({ boardId });
      if (response.data.success) {
        alert(`Successfully removed ${response.data.duplicatesRemoved} duplicate tasks`);
        onRefresh();
      } else {
        alert("Failed to remove duplicates: " + response.data.error);
      }
    } catch (error) {
      alert("Error removing duplicates: " + error.message);
    } finally {
      setCleaningDuplicates(false);
    }
  };

  if (loading || !board) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="py-8 text-center text-slate-600">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Board Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">General Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Board Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Marketing Campaign"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's this board about?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Board Color</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color.gradient} shadow-md hover:shadow-lg transition-all ${
                      formData.color === color.value ? 'ring-4 ring-offset-2 ring-blue-500' : ''
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Board Members */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-lg">Board Members</h3>
            </div>
            
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={formData.members.includes(user.email)}
                      onCheckedChange={() => handleMemberToggle(user.email)}
                      disabled={user.email === currentUser?.email}
                    />
                    <Avatar className="w-8 h-8">
                      {user.profile_picture_url ? (
                        <AvatarImage src={user.profile_picture_url} />
                      ) : (
                        <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {user.full_name}
                        {user.email === currentUser?.email && " (You)"}
                      </label>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    {user.role === 'admin' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Tag Restrictions */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-lg">Tag-Based Access Restrictions</h3>
            </div>
            <p className="text-sm text-slate-500">
              Limit what tasks a user can see on this board. If tags are set for a user, they will only see tasks that have at least one of those tags.
            </p>
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <div className="space-y-4">
                {users.filter(u => u.email !== currentUser?.email).map(user => {
                  const restrictions = tagRestrictions[user.email] || [];
                  const inputVal = tagInputs[user.email] || '';
                  const suggestions = allTags.filter(t => t.toLowerCase().includes(inputVal.toLowerCase()) && !restrictions.includes(t));
                  return (
                    <div key={user.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{user.full_name}</span>
                        <span className="text-xs text-slate-400">{user.email}</span>
                      </div>
                      {restrictions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {restrictions.map(tag => (
                            <Badge key={tag} variant="outline" className="flex items-center gap-1 text-xs">
                              {tag}
                              <button onClick={() => removeTagRestriction(user.email, tag)} className="hover:opacity-70">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="relative">
                        <div className="flex gap-2">
                          <Input
                            value={inputVal}
                            onChange={e => setTagInputs(prev => ({ ...prev, [user.email]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addTagRestriction(user.email, inputVal)}
                            placeholder={restrictions.length === 0 ? "No restrictions (can see all)" : "Add another tag..."}
                            className="h-8 text-xs"
                          />
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => addTagRestriction(user.email, inputVal)} disabled={!inputVal.trim()}>
                            Add
                          </Button>
                        </div>
                        {inputVal && suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-32 overflow-y-auto">
                            {suggestions.map(tag => (
                              <div key={tag} onClick={() => addTagRestriction(user.email, tag)} className="px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer">{tag}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                onClick={handleRemoveDuplicates}
                disabled={cleaningDuplicates}
                variant="outline"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                {cleaningDuplicates ? 'Cleaning...' : 'Remove Duplicate Tasks'}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-600 hover:bg-red-700" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Board
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Board?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{board.name}"? This will permanently delete all columns, tasks, and data associated with this board. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete Board'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || deleting || cleaningDuplicates}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}