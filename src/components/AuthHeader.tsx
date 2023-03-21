"use client";

import { useSession, useSessionContext, useUser } from "@supabase/auth-helpers-react";
import { useCallback, useEffect } from "react";
import { useSupabaseClient } from "~/utils/supabase-client";
import User from "./User";
import DiscordLogo from "$/discord-mark-blue.svg";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AuthHeader() {
  const url = window.location.origin + usePathname();

  const supabase = useSupabaseClient();
  const user = useUser();

  const handleLogout = useCallback(() => supabase.auth.signOut(), [supabase.auth]);

  const handleLogin = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify",
        redirectTo: url,
      },
    });
  }, [supabase.auth, url]);

  useEffect(() => {
    supabase.auth.refreshSession().then((response) => {
      if (response.error) {
        if (response.error.status === 400) return supabase.auth.signOut();
      }
    });
  }, [supabase.auth, url]);

  return (
    <div className="sticky top-2 inset-x-2 z-10 flex justify-between gap-2 mb-8">
      {user && (
        <>
          <Link className="inline-block z-10" href="/">
            <User
              avatar={user.user_metadata.avatar_url}
              avatarSize={32}
              className="py-2 px-3 rounded-xl bg-violet-900 md:bg-violet-900/50 hover:bg-violet-900 transition"
              username={user.user_metadata.full_name}
            />
          </Link>
          <button
            className="py-3 px-4 rounded-xl text-violet-100 bg-violet-900 md:bg-violet-900/50 hover:bg-violet-900 transition"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      )}
      {!user && (
        <button
          className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-violet-100 bg-violet-900"
          onClick={handleLogin}
        >
          <DiscordLogo className="h-8 w-8" />
          Login
        </button>
      )}
    </div>
  );
}
