"use client";

import { useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { fetchWithAuth } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import RoleManagement from "@/components/dashboard/RoleManagement";
import UserManagement from "@/components/dashboard/UserManagement";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/usePermissions";

export default function ProfilePage() {
  const { user, setUser } = useDashboard();
  const [activeTab, setActiveTab] = useState("users"); // "users", "roles"
  const { canRead, canWrite, isAdmin } = usePermissions("profile");

  if (!isAdmin && !canRead && !canWrite) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 border rounded-2xl bg-card text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Profile management has been made unavailable for your role by the administrator. If you need to update your username, name, or password, please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex border-b">
        <button
          className={cn(
            "px-6 py-3 font-medium text-sm transition-colors border-b-2",
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("users")}
        >
          {isAdmin ? "User Management" : "My Profile"}
        </button>
        {isAdmin && (
          <button
            className={cn(
              "px-6 py-3 font-medium text-sm transition-colors border-b-2",
              activeTab === "roles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("roles")}
          >
            Role Management
          </button>
        )}
      </div>

      <div className="mt-6">
        {activeTab === "users" && (
          <div className="space-y-8">
            <ProfileSettings user={user} setUser={setUser} canWrite={isAdmin || canWrite} />
            {isAdmin && <UserManagement />}
          </div>
        )}
        {activeTab === "roles" && isAdmin && <RoleManagement />}
      </div>
    </div>
  );
}

function ProfileSettings({ user, setUser, canWrite }) {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handleChange = (e) => {
    if (!canWrite) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite) {
      setError("You do not have permission to modify your profile credentials.");
      return;
    }
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmNewPassword
    ) {
      setError("New passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetchWithAuth("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      if (data.user) {
        const updatedUser = { ...user, ...data.user };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setSuccessMessage(data.message || "Profile updated successfully");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>My Profile & Credentials</CardTitle>
        <CardDescription>
          {canWrite
            ? "Update your display name, username, and login password."
            : "View your profile details. Modifications are disabled for your role."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!canWrite && (
            <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-md border border-amber-200 flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Read-only access:</strong> Profile editing and credential changes are unavailable for your role. Contact an administrator to request changes.
              </span>
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-100 text-green-700 text-sm p-3 rounded-md border border-green-200">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                required
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-username">Username</Label>
              <Input
                id="profile-username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. jdoe or john@example.com"
                required
                disabled={!canWrite}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
              required={canWrite}
              placeholder={
                canWrite
                  ? "Enter current password to save changes"
                  : "Password change is disabled"
              }
              disabled={!canWrite}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password (Optional)</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder={
                  canWrite
                    ? "Leave blank to keep current"
                    : "Password change is disabled"
                }
                disabled={!canWrite}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                placeholder={
                  canWrite ? "Confirm new password" : "Password change is disabled"
                }
                disabled={!canWrite}
              />
            </div>
          </div>
        </CardContent>
        {canWrite && (
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile Changes
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
