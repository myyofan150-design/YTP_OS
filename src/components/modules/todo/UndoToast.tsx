"use client";

import { toast } from "sonner";

interface Options {
  message?: string;
  onUndo: () => void | Promise<void>;
  duration?: number;
}

export function showUndoToast({ message = "Deleted", onUndo, duration = 5000 }: Options) {
  toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: () => { void onUndo(); },
    },
  });
}
