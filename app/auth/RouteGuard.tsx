"use client";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loading } from "../components/ui/Loading";

interface RouteGuardProps {
  children: ReactNode;
}

// routes require authentication
const PROTECTED_ROUTES = ["/movies", "/shows", "/books", "/games", "/manga"];
const PUBLIC_ROUTES = ["/login", "/register"];

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated, isRefreshing, isInitializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";

  // Check if current path is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  // Check if current path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  // Home page is protected unless explicitly public
  const isHomePageProtected = pathname === "/" && !isPublicRoute;

  // Redirect logic
  useEffect(() => {
    if (isInitializing || isRefreshing) return;

    if ((isProtectedRoute || isHomePageProtected) && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isPublicRoute) {
      router.replace("/");
      return;
    }
  }, [
    isAuthenticated,
    isRefreshing,
    isInitializing,
    pathname,
    isProtectedRoute,
    isHomePageProtected,
    isPublicRoute,
    router,
  ]);

  // Always block rendering until auth state is ready
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loading customStyle="h-12 w-12 border-gray-400" customBg="bg-black" />
      </div>
    );
  }

  if ((isProtectedRoute || isHomePageProtected) && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
