import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { requestEmailChange, requestPasswordReset, deleteAccount } from "@/api/authService";
import { setAuthToken } from "@/api/client";
import { StorageStatsCard } from "@/components/dashboard/StorageStatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- Email change ---
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const emailChangeMutation = useMutation({
    mutationFn: () => requestEmailChange(emailPassword, newEmail),
    onSuccess: () => {
      setEmailSuccess("Verification link sent to your new email address.");
      setEmailError(null);
      setNewEmail("");
      setEmailPassword("");
    },
    onError: (err) => {
      setEmailSuccess(null);
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        setEmailError(typeof detail === "string" ? detail : "Please enter a valid email address.");
      } else {
        setEmailError("Something went wrong. Please try again.");
      }
    },
  });

  // --- Password reset ---
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordResetMutation = useMutation({
    mutationFn: () => requestPasswordReset(user!.email),
    onSuccess: () => {
      setPasswordSuccess("A reset link has been sent to your email.");
      setPasswordError(null);
    },
    onError: () => {
      setPasswordSuccess(null);
      setPasswordError("Something went wrong. Please try again.");
    },
  });

  // --- Delete account ---
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      setAuthToken(null);
      logout();
      navigate("/");
    },
    onError: () => {
      setDeleteError("Failed to delete account. Please try again.");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure? This will permanently delete your account and all your files.")) {
      deleteAccountMutation.mutate();
    }
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium capitalize">{user?.account_tier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex justify-center mt-6">
            <StorageStatsCard />
          </div>
        </CardContent>
      </Card>

      {/* Change email */}
      <Card>
        <CardHeader>
          <CardTitle>Change email</CardTitle>
          <CardDescription>
            A verification link will be sent to your new email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); emailChangeMutation.mutate(); }}
            className="space-y-4"
          >
            {emailSuccess && <p className="text-sm text-green-600">{emailSuccess}</p>}
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            <div className="space-y-2">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={emailChangeMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password">Current password</Label>
              <Input
                id="email-password"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                disabled={emailChangeMutation.isPending}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={emailChangeMutation.isPending}
            >
              {emailChangeMutation.isPending ? "Sending…" : "Request email change"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            A password reset link will be sent to {user?.email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          <Button
            onClick={() => passwordResetMutation.mutate()}
            disabled={passwordResetMutation.isPending}
          >
            {passwordResetMutation.isPending ? "Sending…" : "Send password reset link"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
