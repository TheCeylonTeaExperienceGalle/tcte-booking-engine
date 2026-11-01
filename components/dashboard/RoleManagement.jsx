"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Edit, CheckCircle, XCircle } from "lucide-react";
import { getPermissionModules } from "@/lib/menuConfig";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [error, setError] = useState("");
  
  const permissionModules = getPermissionModules();

  const [formData, setFormData] = useState({
    name: "",
    permissions: {},
    isActive: true,
  });

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const res = await fetchWithAuth("/api/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoles(data.roles);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleEdit = (role) => {
    setEditingRole(role.id);
    setFormData({
      name: role.name,
      permissions: role.permissions || {},
      isActive: role.isActive !== false,
    });
    setError("");
  };

  const handleCancel = () => {
    setEditingRole(null);
    setFormData({ name: "", permissions: {}, isActive: true });
    setError("");
  };

  const handlePermissionChange = (moduleKey, type, checked) => {
    setFormData((prev) => {
      const perms = { ...prev.permissions };
      const current = perms[moduleKey] || { read: false, write: false };
      perms[moduleKey] = {
        ...current,
        [type]: Boolean(checked),
      };

      // If user checks write, automatically ensure read is checked as well
      if (type === "write" && checked) {
        perms[moduleKey].read = true;
      }
      // If user unchecks read, also uncheck write
      if (type === "read" && !checked) {
        perms[moduleKey].write = false;
      }

      return { ...prev, permissions: perms };
    });
  };

  const handleToggleAll = (type) => {
    setFormData((prev) => {
      const perms = { ...prev.permissions };
      const actionableModules = permissionModules.filter(
        (m) => !m.isParent && m.key !== "dashboard"
      );
      const allChecked = actionableModules.every((m) =>
        Boolean(perms[m.key]?.[type])
      );
      const nextValue = !allChecked;

      actionableModules.forEach((mod) => {
        const current = perms[mod.key] || { read: false, write: false };
        perms[mod.key] = {
          ...current,
          [type]: nextValue,
          ...(type === "write" && nextValue ? { read: true } : {}),
          ...(type === "read" && !nextValue ? { write: false } : {}),
        };
      });

      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const url = editingRole ? `/api/roles/${editingRole}` : "/api/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404 && editingRole) {
          setError("This role no longer exists. Switched back to Create Role mode.");
          handleCancel();
          await loadRoles();
          return;
        }
        throw new Error(data.error || "Failed to save role");
      }

      await loadRoles();
      handleCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (role) => {
    const action = role.isActive ? "deactivate" : "activate";
    if (
      !window.confirm(
        `Are you sure you want to ${action} the "${role.name}" role? ${
          role.isActive
            ? "Users currently assigned to this role will keep their data, but this role cannot be assigned to new users."
            : "This role will become assignable to users again."
        }`
      )
    )
      return;

    try {
      const res = await fetchWithAuth(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !role.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} role`);

      await loadRoles();
      if (editingRole === role.id) {
        setFormData((prev) => ({ ...prev, isActive: !role.isActive }));
      }
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

  const actionableModules = permissionModules.filter(
    (m) => !m.isParent && m.key !== "dashboard"
  );
  const allReadChecked = actionableModules.every((m) =>
    Boolean(formData.permissions[m.key]?.read)
  );
  const allWriteChecked = actionableModules.every((m) =>
    Boolean(formData.permissions[m.key]?.write)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{editingRole ? "Edit Role" : "Create New Role"}</span>
                {editingRole && (
                  <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Editing ID: {editingRole}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {editingRole
                  ? "Update role name and module access permissions."
                  : "Define role name and module access permissions."}
              </CardDescription>
            </div>
            {editingRole && (
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                + Create New Role
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
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Reservation Officer"
                  required
                  disabled={editingRole && formData.name === "admin"}
                />
              </div>

              {editingRole && formData.name !== "admin" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-3 pt-2">
                    <Checkbox
                      id="role-active-check"
                      checked={formData.isActive}
                      onCheckedChange={(c) =>
                        setFormData({ ...formData, isActive: c === true })
                      }
                    />
                    <label
                      htmlFor="role-active-check"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Active (Assignable to users)
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-md mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Item / Module</TableHead>
                    <TableHead className="w-[140px] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>Read</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => handleToggleAll("read")}
                          title="Toggle all read permissions"
                        >
                          {allReadChecked ? "Clear" : "All"}
                        </Button>
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>Write</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => handleToggleAll("write")}
                          title="Toggle all write permissions"
                        >
                          {allWriteChecked ? "Clear" : "All"}
                        </Button>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionModules.map((mod) => {
                    const menuPerm = formData.permissions[mod.key] || {
                      read: false,
                      write: false,
                    };
                    const isSubItem = !mod.isParent && mod.parentKey != null;

                    return (
                      <TableRow
                        key={mod.key}
                        className={mod.isParent ? "bg-muted/30 font-semibold" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className={`flex items-center gap-2 ${isSubItem ? "pl-6 text-muted-foreground" : ""}`}>
                            {isSubItem && <span className="text-primary font-bold">↳</span>}
                            <span>{mod.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {mod.isParent || mod.key === "dashboard" ? (
                            <span className="text-muted-foreground text-xs select-none">—</span>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Checkbox
                                id={`read-${mod.key}`}
                                checked={Boolean(menuPerm.read)}
                                onCheckedChange={(c) =>
                                  handlePermissionChange(mod.key, "read", c === true)
                                }
                              />
                              <label
                                htmlFor={`read-${mod.key}`}
                                className={`text-sm font-medium cursor-pointer select-none transition-colors hover:text-primary ${
                                  menuPerm.read ? "text-primary font-semibold" : "text-muted-foreground"
                                }`}
                              >
                                Read
                              </label>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {mod.isParent || mod.key === "dashboard" ? (
                            <span className="text-muted-foreground text-xs select-none">—</span>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Checkbox
                                id={`write-${mod.key}`}
                                checked={Boolean(menuPerm.write)}
                                onCheckedChange={(c) =>
                                  handlePermissionChange(mod.key, "write", c === true)
                                }
                              />
                              <label
                                htmlFor={`write-${mod.key}`}
                                className={`text-sm font-medium cursor-pointer select-none transition-colors hover:text-primary ${
                                  menuPerm.write ? "text-primary font-semibold" : "text-muted-foreground"
                                }`}
                              >
                                Write
                              </label>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="flex px-6 pb-6 gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
            {editingRole && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Roles</CardTitle>
          <CardDescription>
            Roles control access across dashboard modules. Active roles can be assigned to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Assigned Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow
                  key={role.id}
                  className={editingRole === role.id ? "bg-primary/5 font-medium" : ""}
                >
                  <TableCell className="capitalize">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.name}</span>
                      {editingRole === role.id && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Editing
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{role._count?.users || 0}</TableCell>
                  <TableCell>
                    {role.isActive !== false ? (
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(role)}
                        title="Edit role"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {role.name !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            role.isActive !== false
                              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 text-xs"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs"
                          }
                          onClick={() => handleToggleStatus(role)}
                          title={role.isActive !== false ? "Inactivate role" : "Activate role"}
                        >
                          {role.isActive !== false ? (
                            <span className="flex items-center gap-1 font-medium">
                              <XCircle className="h-3.5 w-3.5" /> Inactivate
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Activate
                            </span>
                          )}
                        </Button>
                      )}
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
