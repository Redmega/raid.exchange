"use client";

import { ArrowRightIcon } from "@heroicons/react/24/solid";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Profile, useSupabaseClient } from "~/utils/supabase-client";
import { useLocalStorage } from "usehooks-ts";
import { useRouter, useSearchParams } from "next/navigation";
import { useSessionContext, useUser } from "@supabase/auth-helpers-react";
import { v4 as uuidv4 } from "uuid";
import DiscordLogo from "$/discord-mark-blue.svg";
import Image from "next/image";
import Logo from "$/logo.png";
import { random } from "lodash-es";

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { isLoading } = useSessionContext();

  const router = useRouter();
  const params = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");

  const [anonAuthToken, setAuthToken] = useLocalStorage<{ id?: string; provider?: "discord" }>("RE_ANON_AUTH_KEY", {});

  const fetchProfile = useCallback(async () => {
    const response = await supabase.from("profile").select().eq("user_id", user?.id).maybeSingle();

    if (response.error) console.error(response.error);
    else {
      setProfile(response.data);
      setUsername(response.data?.username ?? "");
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!isLoading && user?.id) fetchProfile();
    else if (!isLoading && !user && anonAuthToken.id && anonAuthToken.provider !== "discord") {
      // Attempt a login using stored credentials
      supabase.auth
        .signInWithPassword({ email: `${anonAuthToken.id}@users.raid.exchange`, password: anonAuthToken.id })
        .then((response) => {
          if (response.error) {
            console.error(response.error);
            setAuthToken({});
          } else {
            const redirectTo = params.get("to");
            if (redirectTo) router.push(redirectTo);
          }
        });
    }
  }, [anonAuthToken, fetchProfile, isLoading, params, router, setAuthToken, supabase, user, user?.id]);

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            full_name: username,
          },
        });
        const response = await supabase.from("profile").update({ username }).eq("user_id", user.id);
        if (response.error) console.error(response.error);
        else window.location.reload();
        return;
      }

      // Generate a new anonymous user
      const uuid = anonAuthToken.id ?? uuidv4();

      const response = await supabase.auth.signUp({
        email: `${uuid}@users.raid.exchange`,
        password: uuid,
        options: {
          data: {
            full_name: username,
            avatar_url: window.location.origin + `/avatars/${random(3)}.png`,
          },
        },
      });
      if (response.error) console.error(response.error);
      else {
        setAuthToken({ id: uuid });
        const redirectTo = params.get("to");
        if (redirectTo) router.push(redirectTo);
      }
    },
    [anonAuthToken.id, params, router, setAuthToken, supabase, user, username]
  );

  const handleDiscordSignup = useCallback(async () => {
    const response = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        scopes: "identify",
        redirectTo: window.location.toString(),
      },
    });
    if (response.error) console.error(response.error);
  }, [supabase.auth]);

  // For discord login, save auth token
  useEffect(() => {
    if (!anonAuthToken.id && user?.app_metadata?.provider === "discord")
      setAuthToken({ id: user.id, provider: "discord" });
    if (!user && !isLoading) setUsername("");
  }, [anonAuthToken, isLoading, setAuthToken, user]);

  return (
    <>
      <hgroup className="mb-8 text-center">
        <Image className="h-24 w-24 mx-auto" alt="Raid.Exchange Logo" src={Logo} priority />
        <h1 className="font-title font-bold text-4xl sm:text-6xl text-zinc-100 leading-relaxed">Raid.Exchange</h1>
        <p className="px-2 font-title text-xl text-zinc-300">The easiest way to raid.</p>
      </hgroup>
      <div className="max-w-sm mx-auto">
        <form onSubmit={handleSubmit}>
          <label className="flex flex-col">
            <small className="text-sm text-violet-300 mb-2">
              This can be your ign/discord tag or whatever you like!
            </small>
            <input
              type="text"
              autoComplete="username"
              className="mb-2 outline-none rounded-lg bg-zinc-900/50 p-4 h-full w-full resize-none placeholder:text-violet-300"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
          </label>
          <button
            className="flex items-center justify-center gap-2 rounded-lg w-full bg-violet-700 py-2 px-4 font-bold font-title tracking-wider mb-2"
            type="submit"
          >
            {user ? "Update" : "Sign Up Anonymously"}
            <ArrowRightIcon className="w-6 h-6" />
          </button>
          {user?.app_metadata?.provider !== "discord" && (
            <button
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-wider mb-2"
              type="button"
              onClick={handleDiscordSignup}
            >
              Login with Discord
              <DiscordLogo className="h-8 w-8" />
            </button>
          )}
          {!isLoading && !user && anonAuthToken.provider === "discord" && (
            <p className="text-xs text-center text-violet-300">You have previously logged in with Discord!</p>
          )}
        </form>
      </div>
    </>
  );
}
