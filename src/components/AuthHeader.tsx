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
    <>
      {user && (
        <>
          <Link className="absolute top-0 left-0 m-2 z-10" href="/">
            <User
              avatar={user.user_metadata.avatar_url}
              avatarSize={32}
              className="py-2 px-3 rounded-xl bg-violet-900/50"
              username={user.user_metadata.full_name}
            />
          </Link>
          <button
            className="z-10 absolute top-0 right-0 m-2 py-3 px-4 rounded-xl text-violet-100 bg-violet-900"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      )}
      {!user && (
        <button
          className="z-10 flex items-center justify-center gap-2 absolute top-0 left-0 m-2 py-2 px-3 rounded-xl text-violet-100 bg-violet-900"
          onClick={handleLogin}
        >
          <DiscordLogo className="h-8 w-8" />
          Login
        </button>
      )}
    </>
  );
}
