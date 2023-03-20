"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode, useEffect, useState } from "react";

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {});

    return () => subscription.unsubscribe();
  }, [supabaseClient.auth]);

  return <SessionContextProvider supabaseClient={supabaseClient}>{children}</SessionContextProvider>;
}
