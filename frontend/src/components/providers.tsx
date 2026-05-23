"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" className="sm:!top-right" />
    </AuthProvider>
  );
}
