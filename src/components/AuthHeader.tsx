import { useUser } from "@supabase/auth-helpers-react";
import { useCallback } from "react";
import { useSupabaseClient } from "~/utils/supabase-client";
import User from "./User";
import DiscordLogo from "$/discord-mark-blue.svg";

export default function AuthHeader() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const handleLogout = useCallback(
    () => supabase.auth.signOut(),
    [supabase.auth]
  );

  const handleLogin = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify",
      },
    });
  }, [supabase.auth]);

  return (
    <>
      {user && (
        <>
          <User
            avatar={user.user_metadata.avatar_url}
            avatarSize={32}
            className="absolute top-0 left-0 py-2 px-3 rounded-xl bg-violet-900/50"
            username={user.user_metadata.full_name}
          />
          <button
            className="absolute top-0 right-0 py-3 px-4 rounded-xl text-violet-100 bg-violet-900"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      )}
      {!user && (
        <button
          className="flex items-center justify-center gap-2 absolute top-0 left-0 py-2 px-3 rounded-xl text-violet-100 bg-violet-900"
          onClick={handleLogin}
        >
          <DiscordLogo className="h-8 w-8" />
          Login
        </button>
      )}
    </>
  );
}
