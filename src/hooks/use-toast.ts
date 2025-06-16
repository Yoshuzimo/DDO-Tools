// src/hooks/use-toast.ts
"use client";

import type { ReactElement } from "react";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: ReactElement; // Action buttons are not easily supported by console.log/error
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    const messageParts: string[] = [];
    if (title) messageParts.push(title);
    if (description) messageParts.push(description);
    const message = messageParts.join(": ");

    if (variant === "destructive") {
      console.error(`Toast (Error): ${message}`);
    } else {
      console.log(`Toast (Info): ${message}`);
    }
  };

  const dismiss = (toastId?: string) => {
    // Placeholder if a custom UI system is built later
    console.log(`Dismiss toast: ${toastId || "all"}`);
  };

  return { toast, dismiss };
}

// Global toast function (simplified)
export const toast = ({ title, description, variant }: ToastProps) => {
  const messageParts: string[] = [];
  if (title) messageParts.push(title);
  if (description) messageParts.push(description);
  const message = messageParts.join(": ");

  if (variant === "destructive") {
    console.error(`Toast (Error): ${message}`);
  } else {
    console.log(`Toast (Info): ${message}`);
  }
};
