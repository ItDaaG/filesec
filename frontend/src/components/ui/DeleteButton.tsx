import { Trash2 } from "lucide-react";

/**
 * DeleteButton — a reusable two-step delete confirmation button.
 *
 * Usage:
 *   <DeleteButton
 *     visible={isHovered}           // controls opacity (tie to hover state of parent)
 *     onConfirm={() => handleDelete(item)}
 *   />
 *
 * Behaviour:
 *   - First click:  shows "Delete?" label and highlights the icon
 *   - Second click: fires onConfirm()
 *   - Parent controls visibility via `visible` prop (opacity transition)
 *   - Pass `onCancelRef` if you need to reset confirmation from outside
 *     (e.g. on mouse-leave). Call onCancelRef.current?.() to reset.
 *
 * Example with mouse-leave cancel:
 *   const cancelRef = useRef<(() => void) | null>(null);
 *   <div onMouseLeave={() => cancelRef.current?.()}>
 *     <DeleteButton visible={hovered} onConfirm={handleDelete} onCancelRef={cancelRef} />
 *   </div>
 */

import { useState } from "react";

interface DeleteButtonProps {
  /** Whether the button is visible (tied to parent hover state) */
  visible: boolean;
  /** Called when the user confirms deletion (second click) */
  onConfirm: () => void;
  /** Optional ref so the parent can cancel confirmation (e.g. on mouse-leave) */
  onCancelRef?: React.MutableRefObject<(() => void) | null>;
  ariaLabel?: string;
}

export const DeleteButton = ({
  visible,
  onConfirm,
  onCancelRef,
  ariaLabel = "Delete",
}: DeleteButtonProps) => {
  const [confirming, setConfirming] = useState(false);

  const cancel = () => setConfirming(false);

  // Expose cancel to parent via ref
  if (onCancelRef) onCancelRef.current = cancel;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onConfirm();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* "Delete?" label — slides in when confirming */}
      <span
        className={`
          text-xs font-medium text-red-500 whitespace-nowrap
          transition-all duration-200 overflow-hidden
          ${confirming ? "max-w-[60px] opacity-100" : "max-w-0 opacity-0"}
        `}
      >
        Delete?
      </span>

      <button
        type="button"
        onClick={handleClick}
        aria-label={confirming ? "Confirm delete" : ariaLabel}
        className={`
          flex items-center justify-center rounded-full p-1.5
          transition-all duration-200
          ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}
          ${confirming
            ? "bg-red-100 dark:bg-red-950 text-red-600 scale-110"
            : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          }
        `}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};
