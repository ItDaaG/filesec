import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DeleteButtonProps {
  onConfirm: () => void;
  /** Row label in the menu; also used as dialog title unless `dialogTitle` is set */
  label?: string;
  dialogTitle?: string;
  description?: string;
  className?: string;
  /** `menu` = dropdown row + dialog; `inline` = icon trigger + dialog */
  variant?: "menu" | "inline";
  /** inline: fade with parent hover */
  visible?: boolean;
  onCancelRef?: React.MutableRefObject<(() => void) | null>;
  ariaLabel?: string;
}

export const DeleteButton = ({
  onConfirm,
  label = "Delete",
  dialogTitle,
  description = "This action cannot be undone.",
  className,
  variant = "inline",
  visible = true,
  onCancelRef,
  ariaLabel = "Delete",
}: DeleteButtonProps) => {
  const [open, setOpen] = useState(false);

  const cancel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!onCancelRef) return;
    onCancelRef.current = cancel;
    return () => {
      onCancelRef.current = null;
    };
  }, [onCancelRef, cancel]);

  const title = dialogTitle ?? label;

  const footer = (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </DialogClose>
      <DialogClose asChild>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
        >
          {label}
        </Button>
      </DialogClose>
    </DialogFooter>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "menu" ? (
        <DialogTrigger asChild>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className={cn("text-destructive focus:text-destructive", className)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center justify-center rounded-full p-1.5 transition-all duration-200",
              visible ? "opacity-100" : "opacity-0 pointer-events-none",
              "text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {footer}
      </DialogContent>
    </Dialog>
  );
};
