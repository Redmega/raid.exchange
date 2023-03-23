"use client";

import { useSessionContext, useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { FormEvent, useCallback, useContext, useEffect, useState } from "react";
import { Profile, useSupabaseClient } from "~/utils/supabase-client";
import Logo from "$/logo.png";
import { ArrowRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useLocalStorage } from "usehooks-ts";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { isLoading } = useSessionContext();

  const router = useRouter();
  const params = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");

  const [{ id: anonAuthToken }, setAnonAuthToken] = useLocalStorage<{ id?: string }>("RE_ANON_AUTH_KEY", {});

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
    else if (!isLoading && !user && anonAuthToken) {
      // Attempt a login using stored credentials
      supabase.auth
        .signInWithPassword({ email: `${anonAuthToken}@users.raid.exchange`, password: anonAuthToken })
        .then((response) => {
          if (response.error) {
            console.error(response.error);
            setAnonAuthToken({});
          } else {
            const redirectTo = params.get("to");
            if (redirectTo) router.push(redirectTo);
          }
        });
    }
  }, [anonAuthToken, fetchProfile, isLoading, params, router, setAnonAuthToken, supabase, user, user?.id]);

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (user) {
        const response = await supabase.from("profile").update({ username });
        if (response.error) console.error(response.error);
        return;
      }

      // Generate a new anonymous user
      const uuid = window.crypto.randomUUID();

      const response = await supabase.auth.signUp({
        email: `${uuid}@users.raid.exchange`,
        password: uuid,
        options: {
          data: {
            full_name: username,
          },
        },
      });
      if (response.error) console.error(response.error);
      else {
        setAnonAuthToken({ id: uuid });
        const redirectTo = params.get("to");
        if (redirectTo) router.push(redirectTo);
      }
    },
    [params, router, setAnonAuthToken, supabase, user, username]
  );

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
            className="flex items-center justify-center ml-auto rounded-lg bg-violet-700 py-2 px-4 max-w-[theme(spacing.32)] font-bold font-title tracking-wider"
            type="submit"
          >
            {user ? "Update" : "Sign Up"}
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </button>
        </form>
      </div>
    </>
  );
}
