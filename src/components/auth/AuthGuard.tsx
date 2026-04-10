"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const hasAuth = Boolean(session?.user ?? user);

      if (PUBLIC_ROUTES.includes(pathname)) {
        if (hasAuth) {
          router.replace("/dashboard");
          return;
        }
        if (mounted) setChecking(false);
        return;
      }

      if (!hasAuth) {
        // Small delay avoids redirect race right after sign-in in some environments.
        setTimeout(() => {
          if (mounted) router.replace("/login");
        }, 200);
      } else if (mounted) {
        setChecking(false);
      }
    }

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (PUBLIC_ROUTES.includes(pathname)) {
          router.replace("/dashboard");
        }
        if (mounted) setChecking(false);
        return;
      }

      if (!session?.user && !PUBLIC_ROUTES.includes(pathname)) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}
