import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SharedUser, ShareResult } from "@/types/file";

function shareMutationErrorMessage(err: unknown): string {
  const ax = err as { response?: { data?: { detail?: string } } };
  const d = ax.response?.data?.detail;
  return typeof d === "string" ? d : "Failed to share. Please try again.";
}

export interface ShareAccessPanelPermissions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<SharedUser[]>;
  enabled?: boolean;
}

export interface ShareAccessPanelProps {
  /** List + revoke; omit for invite-only (no permissions query). */
  permissions?: ShareAccessPanelPermissions;
  /** One email per call; API still receives `[email]`. */
  share: (email: string) => Promise<ShareResult>;
  revoke?: (userId: number) => Promise<void>;
  /** When false, clears email and error (e.g. dialog closed). Default true. */
  active?: boolean;
  /** After successful share/revoke (e.g. invalidate unrelated queries). */
  onMutationSettled?: () => void;
  onSharePendingChange?: (pending: boolean) => void;
}

export function ShareAccessPanel({
  permissions,
  share,
  revoke,
  active = true,
  onMutationSettled,
  onSharePendingChange,
}: ShareAccessPanelProps) {
  const queryClient = useQueryClient();
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);

  const listEnabled = Boolean(permissions) && (permissions?.enabled ?? true) && active;

  const { data: sharedUsers = [] } = useQuery({
    queryKey: permissions?.queryKey ?? ["share-access-panel", "noop"],
    queryFn: permissions?.queryFn ?? (async () => []),
    enabled: listEnabled,
  });

  useEffect(() => {
    if (!active) {
      setShareEmail("");
      setShareError(null);
    }
  }, [active]);

  const shareMutation = useMutation({
    mutationFn: (email: string) => share(email),
    onMutate: () => onSharePendingChange?.(true),
    onSettled: () => onSharePendingChange?.(false),
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
      if (permissions) {
        queryClient.invalidateQueries({ queryKey: permissions.queryKey });
      }
      onMutationSettled?.();
    },
    onError: (err) => setShareError(shareMutationErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => {
      if (!revoke) return Promise.resolve();
      return revoke(userId);
    },
    onSuccess: () => {
      if (permissions) {
        queryClient.invalidateQueries({ queryKey: permissions.queryKey });
      }
      onMutationSettled?.();
    },
  });

  const handleAddShare = () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email) return;
    setShareError(null);
    shareMutation.mutate(email);
  };

  const inviteRow = (
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
          type="button"
          size="sm"
          onClick={handleAddShare}
          disabled={shareMutation.isPending || !shareEmail.trim()}
          className="h-8 text-xs px-3"
        >
          Add
        </Button>
      </div>
      {shareError ? <p className="text-xs text-destructive">{shareError}</p> : null}
    </div>
  );

  if (!permissions) {
    return <div className="space-y-2">{inviteRow}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Users size={12} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          Shared with ({sharedUsers.length})
        </span>
      </div>

      {sharedUsers.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-4">Not shared with anyone</p>
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
              {revoke ? (
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(u.id)}
                  disabled={revokeMutation.isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
                  aria-label={`Remove ${u.email}`}
                >
                  <X size={13} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {inviteRow}
    </div>
  );
}
