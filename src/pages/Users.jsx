import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, User as UserIcon } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const me = await User.me();
      setCurrentUser(me);
      
      // Check if user is admin
      if (me.role !== 'admin') {
        return;
      }

      const allUsers = await User.list("-created_date");
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCompany = async (userId, company) => {
    await base44.entities.User.update(userId, { company });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, company } : u));
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Admin Access Required</h3>
              <p className="text-slate-600">You need administrator privileges to view this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Users Management
          </h1>
          <p className="text-white/90">View and manage all users in the system</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or email..."
            className="pl-10 h-12 bg-white shadow-lg"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="border-none shadow-xl hover:shadow-2xl transition-all duration-200 bg-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    {user.profile_picture_url ? (
                      <AvatarImage src={user.profile_picture_url} alt={user.full_name} />
                    ) : (
                      <AvatarFallback className="text-lg bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                        {user.full_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {user.full_name}
                      </h3>
                      {user.id === currentUser.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate mb-3">{user.email}</p>
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <UserIcon className="w-3 h-3 mr-1" />
                          User
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 mb-1">Company</p>
                      <Select
                        value={user.company || ""}
                        onValueChange={v => updateCompany(user.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Set company..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ThinkEngine">ThinkEngine</SelectItem>
                          <SelectItem value="Cogs">Cogs</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {user.created_date && (
                      <p className="text-xs text-slate-500 mt-2">
                        Joined {new Date(user.created_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="border-none shadow-xl bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <UserIcon className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No users found</h3>
              <p className="text-slate-600">Try adjusting your search terms</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}