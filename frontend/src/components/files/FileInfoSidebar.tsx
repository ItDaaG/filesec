import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Globe, Lock, Pencil, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getFilePermissions,
  revokeFileShare,
  shareFile,
  updateFile,
} from "@/api/fileService";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { File as FileType } from "@/types/file";
import { formatDate, formatFileSize } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right break-all">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FileInfoSidebarProps {
  file: FileType;
  onClose: () => void;
}

export const FileInfoSidebar = ({ file, onClose }: FileInfoSidebarProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === file.owner_id;

  // --- Filename editing ---
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(file.filename);

  // Keep name input in sync with file prop (e.g. after successful update)
  useEffect(() => {
    if (!editingName) setNameValue(file.filename);
  }, [file.filename, editingName]);

  // --- Share input ---
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);

  // --- Queries ---
  const { data: sharedUsers = [] } = useQuery({
    queryKey: QUERY_KEYS.filePermissions(file.id),
    queryFn: () => getFilePermissions(file.id),
    enabled: isOwner,
  });

  // --- Mutations ---
  const updateMutation = useMutation({
    mutationFn: (data: { filename?: string; is_public?: boolean }) =>
      updateFile(file.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fileById(file.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files.all() });
      setEditingName(false);
    },
    onError: () => {
      // Revert draft on failure
      setNameValue(file.filename);
      setEditingName(false);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => revokeFileShare(file.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.filePermissions(file.id),
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (email: string) => shareFile(file.id, [email]),
    onSuccess: (result) => {
      if (result.not_found?.length) {
        setShareError(`User not found: ${result.not_found.join(", ")}`);
        return;
      }
      if (result.already_shared?.length) {
        setShareError(`Already shared with: ${result.already_shared.join(", ")}`);
        return;
      }
      setShareEmail("");
      setShareError(null);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.filePermissions(file.id),
      });
    },
    onError: () => setShareError("Failed to share. Please try again."),
  });

  // --- Handlers ---
  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === file.filename) {
      setEditingName(false);
      setNameValue(file.filename);
      return;
    }
    updateMutation.mutate({ filename: trimmed });
  };

  const handleTogglePublic = () => {
    updateMutation.mutate({ is_public: !file.is_public });
  };

  const handleAddShare = () => {
    const email = shareEmail.trim();
    if (!email) return;
    setShareError(null);
    shareMutation.mutate(email);
  };

  const ext = file.filename.split(".").pop()?.toLowerCase() ?? "";
  const displayType = (() => {
    const mime = (file.mime_type ?? "").trim().toLowerCase();
    if (mime && mime !== "application/octet-stream") {
      const subtype = (mime.split("/")[1] ?? "").split("+").pop()?.trim();
      if (subtype) return subtype;
    }
    return ext ? ext : "Unknown";
  })();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold">Details</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ---- Name ---- */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Name
          </h3>

          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameValue(file.filename);
                  }
                }}
                className="h-8 text-sm flex-1"
                autoFocus
                disabled={updateMutation.isPending}
              />
              <button
                onClick={handleSaveName}
                disabled={updateMutation.isPending}
                className="text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                aria-label="Save name"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => { setEditingName(false); setNameValue(file.filename); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2 group">
              <p className="text-sm break-all flex-1">{file.filename}</p>
              {isOwner && (
                <button
                  onClick={() => setEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all mt-0.5 shrink-0"
                  aria-label="Edit name"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* ---- Metadata ---- */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Info
          </h3>
          <dl className="space-y-2.5">
            <MetaRow label="Type" value={displayType} />
            <MetaRow label="Size" value={formatFileSize(file.file_size)} />
            <MetaRow label="Created" value={formatDate(file.created_at)} />
            {isOwner && (
              <MetaRow
                label="Location"
                value={file.folder_id ? `Folder #${file.folder_id}` : "Root"}
              />
            )}
          </dl>
        </section>

        {/* ---- Permissions ---- */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Permissions
          </h3>

          {/* Public / Private toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2">
              {file.is_public ? (
                <Globe size={14} className="text-primary" />
              ) : (
                <Lock size={14} className="text-muted-foreground" />
              )}
              <span className="text-sm">{file.is_public ? "Public" : "Private"}</span>
            </div>

            {isOwner ? (
              <button
                onClick={handleTogglePublic}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  file.is_public ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                aria-label={file.is_public ? "Make private" : "Make public"}
                role="switch"
                aria-checked={file.is_public}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    file.is_public ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {file.is_public ? "Anyone can view" : "Owner only"}
              </span>
            )}
          </div>

          {/* Shared users (owner only) */}
          {isOwner && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  Shared with ({sharedUsers.length})
                </span>
              </div>

              {sharedUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-4">
                  Not shared with anyone
                </p>
              ) : (
                <ul className="space-y-1">
                  {sharedUsers.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => revokeMutation.mutate(u.id)}
                        disabled={revokeMutation.isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
                        aria-label={`Remove ${u.email}`}
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add user by email */}
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Share by email…"
                    value={shareEmail}
                    onChange={(e) => {
                      setShareEmail(e.target.value);
                      setShareError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddShare();
                    }}
                    className="h-8 text-xs flex-1"
                    disabled={shareMutation.isPending}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddShare}
                    disabled={shareMutation.isPending || !shareEmail.trim()}
                    className="h-8 text-xs px-3"
                  >
                    Add
                  </Button>
                </div>
                {shareError && (
                  <p className="text-xs text-destructive">{shareError}</p>
                )}
              </div>
            </div>
          )}

          {/* Non-owner: just show access level */}
          {!isOwner && (
            <p className="text-xs text-muted-foreground">
              You have read access to this file.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
