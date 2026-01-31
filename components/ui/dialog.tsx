"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">{children}</div>
    </div>
  );
};

const DialogContent = ({ className, children, ...props }: DialogContentProps) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const DialogHeader = ({ className, children, ...props }: DialogHeaderProps) => {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 border-b border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  );
};

const DialogTitle = ({ className, children, ...props }: DialogTitleProps) => {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

const DialogDescription = ({ className, children, ...props }: DialogDescriptionProps) => {
  return (
    <p className={cn("text-sm text-gray-500", className)} {...props}>
      {children}
    </p>
  );
};

const DialogClose = ({ className, children, onClick }: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <button
      className={cn("absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100", className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
};