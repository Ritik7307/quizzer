"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "ADMIN" | "CANDIDATE";
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const userRole = (user.role as string || "").toUpperCase();
    if (role && userRole !== role && userRole !== "ADMIN") {
      router.replace(userRole === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [user, loading, role, router]);

  const userRole = (user?.role as string || "").toUpperCase();
  const isRoleMismatched = role && userRole !== role && userRole !== "ADMIN";

  if (loading || !user || isRoleMismatched) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
