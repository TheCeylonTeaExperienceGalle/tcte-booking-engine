"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Edit, UserX, UserCheck } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    roleId: ""
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [uRes, rRes] = await Promise.all([
        fetchWithAuth("/api/users"),
        fetchWithAuth("/api/roles")
      ]);
      const [uData, rData] = await Promise.all([uRes.json(), rRes.json()]);
      
      if (!uRes.ok) throw new Error(uData.error || "Failed to load users");
      if (!rRes.ok) throw new Error(rData.error || "Failed to load roles");
      
      setUsers(uData.users || []);
      setRoles(rData.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setFormData({
      name: user.name || "",
      username: user.email || "", // backend email field acts as username
      password: "", // do not populate password
      roleId: user.role?.id?.toString() || ""
    });
    setError("");
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({ name: "", username: "", password: "", roleId: "" });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const url = editingUser ? `/api/users/${editingUser}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        roleId: formData.roleId
      };

      if (!editingUser) {
        payload.password = formData.password;
      } else if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save user");

      // Update state immediately so UI refreshes with no delay
      if (data.user) {
        if (editingUser) {
          setUsers(prev => prev.map(u => u.id === editingUser ? { ...u, ...data.user } : u));
        } else {
          setUsers(prev => [data.user, ...prev]);
        }
      }

      await loadData();
      handleCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        if (!window.confirm("Are you sure you want to deactivate this user? They will not be able to log in.")) return;
        const res = await fetchWithAuth(`/api/users/${userId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to deactivate user");
      } else {
        const res = await fetchWithAuth(`/api/users/${userId}`, { 
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to activate user");
      }
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // Filter roles: Inactive roles cannot be assigned to new users or changed to.
  // If editing an existing user with an inactive role, show that role with (Inactive).
  const assignableRoles = roles.filter(r => r.isActive !== false || (editingUser && formData.roleId === r.id.toString()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editingUser ? "Edit User" : "Create New User"}</CardTitle>
              <CardDescription>
                {editingUser 
                  ? "Update the user's name, username, and assigned role." 
                  : "Add a new user to the system and assign them an active role."}
              </CardDescription>
            </div>
            {editingUser && (
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                + Create New User
              </Button>
            )}
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input 
                  id="user-name"
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. John Doe" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-username">Username *</Label>
                <Input 
                  id="user-username"
                  type="text"
                  value={formData.username} 
                  onChange={e => setFormData({ ...formData, username: e.target.value })} 
                  placeholder="e.g. jdoe or john@example.com"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-role">Role *</Label>
                <Select value={formData.roleId} onValueChange={v => setFormData({ ...formData, roleId: v })} required>
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name} {r.isActive === false ? "(Inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password">
                  {editingUser ? "Password (leave blank to keep current)" : "Password *"}
                </Label>
                <Input 
                  id="user-password"
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                  placeholder={editingUser ? "Enter new password to change" : "At least 6 characters"}
                  required={!editingUser} 
                  minLength={6}
                />
              </div>
            </div>
          </CardContent>
          <div className="flex px-6 pb-6 gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
            {editingUser && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
          <CardDescription>
            System users with login access and role assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className={editingUser === u.id ? "bg-primary/5 font-medium" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{u.name || "—"}</span>
                      {editingUser === u.id && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Editing
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">
                    <span>{u.role?.name || "No Role"}</span>
                    {u.role?.isActive === false && (
                      <span className="ml-1 text-xs text-amber-600 font-semibold">(Inactive Role)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} title="Edit user">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={u.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"} 
                        onClick={() => toggleUserStatus(u.id, u.isActive)}
                        title={u.isActive ? "Deactivate user" : "Activate user"}
                      >
                        {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
