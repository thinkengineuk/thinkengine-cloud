
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User } from "@/entities/User"; // Assuming User entity exists
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function CreateBoardDialog({ open, onOpenChange, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
    members: [], // Added members array for access control
  });
  const [users, setUsers] = useState([]); // State to store all users
  const [currentUser, setCurrentUser] = useState(null); // State to store the current user

  // Effect to load users and reset form data when the dialog opens
  useEffect(() => {
    if (open) {
      // Pick a random color for new boards
      const randomColor = colors[Math.floor(Math.random() * colors.length)].value;
      // Reset form data to initial state when the dialog is opened
      setFormData({ 
        name: "", 
        description: "", 
        color: randomColor,
        members: [] // Clear members list for a fresh start
      });
      loadUsers();
    }
  }, [open]);
  
  // Function to load users and set the current user
  const loadUsers = async () => {
    try {
      const allUsers = await User.list(); // Fetch all users
      const me = await User.me(); // Fetch current user
      setUsers(allUsers);
      setCurrentUser(me);
      // Automatically add current user's email to the board members
      setFormData(prev => ({...prev, members: [me.email]}));
    } catch (error) {
      console.error("Failed to load users:", error);
      // Optionally handle error in UI
    }
  };

  // Function to toggle a user's membership on the board
  const handleMemberToggle = (email) => {
    setFormData(prev => {
      const members = prev.members.includes(email)
        ? prev.members.filter(m => m !== email) // Remove if already included
        : [...prev.members, email]; // Add if not included
      return { ...prev, members };
    });
  };

  // Handles the form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData); // Pass the form data to the onSubmit prop
    // Form reset is now handled by the useEffect when 'open' changes (e.g., dialog closes and reopens)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Board Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Marketing Campaign"
              required
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
            <div className="flex flex-wrap gap-3">
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
          
          <div className="space-y-3">
            <Label>Assign Members</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={formData.members.includes(user.email)}
                      onCheckedChange={() => handleMemberToggle(user.email)}
                      // Disable checkbox for the current user to ensure they are always a member
                      disabled={user.email === currentUser?.email}
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {user.full_name} ({user.email}) {user.email === currentUser?.email ? "(You)" : ""}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
              Create Board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
