
import React, { useState, useEffect, useCallback } from "react";
import { Board } from "@/entities/Board";
import { User } from "@/entities/User";
import { Column } from "@/entities/Column";
import { Task } from "@/entities/Task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Trash2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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

const colors = [
  { value: 'blue', label: 'Blue', gradient: 'from-blue-400 to-blue-600' },
  { value: 'purple', label: 'Purple', gradient: 'from-purple-400 to-purple-600' },
  { value: 'green', label: 'Green', gradient: 'from-green-400 to-green-600' },
  { value: 'orange', label: 'Orange', gradient: 'from-orange-400 to-orange-600' },
  { value: 'pink', label: 'Pink', gradient: 'from-pink-400 to-pink-600' },
];

export default function BoardSettings() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');

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
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      alert("Board settings saved successfully!");
      navigate(`${createPageUrl("Board")}?id=${boardId}`);
    } catch (error) {
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Delete all columns and tasks
      const columns = await Column.filter({ board_id: boardId });
      for (const column of columns) {
        const tasks = await Task.filter({ column_id: column.id });
        for (const task of tasks) {
          try {
            await Task.delete(task.id);
          } catch (error) {
            console.warn(`Failed to delete task ${task.id}:`, error);
            // Continue with other tasks
          }
        }
        
        try {
          await Column.delete(column.id);
        } catch (error) {
          console.warn(`Failed to delete column ${column.id}:`, error);
          // Continue with other columns
        }
      }
      
      // Delete the board
      await Board.delete(boardId);
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Failed to delete board:', error);
      alert('Failed to delete board: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-slate-600">Board not found</div>
        <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${createPageUrl("Board")}?id=${boardId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Board Settings</h1>
            <p className="text-slate-600">Manage board details and members</p>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Update board name, description, and appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.gradient} shadow-md hover:shadow-lg transition-all ${
                      formData.color === color.value ? 'ring-4 ring-offset-2 ring-blue-500' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Board Members
            </CardTitle>
            <CardDescription>Manage who has access to this board</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 w-full rounded-md border p-4">
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
                      <AvatarImage src={user.profile_picture_url} />
                      <AvatarFallback>{user.full_name[0]}</AvatarFallback>
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
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Board
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
