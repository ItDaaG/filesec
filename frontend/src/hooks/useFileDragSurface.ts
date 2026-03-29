import { useCallback, useRef, useState, type DragEvent } from "react";

/**
 * Drag-over highlight for a file drop surface (enter/leave depth avoids flicker over children).
 */
export function useFileDragSurface() {
  const depthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetDragHighlight = useCallback(() => {
    depthRef.current = 0;
    setIsDragOver(false);
  }, []);

  const dragSurfaceHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      depthRef.current += 1;
      if (depthRef.current === 1) setIsDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      depthRef.current -= 1;
      if (depthRef.current <= 0) {
        depthRef.current = 0;
        setIsDragOver(false);
      }
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
  };

  return { isDragOver, dragSurfaceHandlers, resetDragHighlight };
}
