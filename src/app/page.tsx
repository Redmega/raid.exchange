"use client";

import Image from "next/image";
import { MouseEvent, useCallback } from "react";
import Logo from "$/logo.png";
import { useSupabaseClient } from "~/utils/supabase-client";
import { useUser } from "@supabase/auth-helpers-react";
import Link from "next/link";

export default function Home() {
  const user = useUser();

  return (
    <>
      <hgroup className="mb-8 text-center">
        <Image className="h-24 w-24 mx-auto" alt="Raid.Exchange Logo" src={Logo} priority />
        <h1 className="font-title font-bold text-4xl sm:text-6xl text-zinc-100 leading-relaxed">Raid.Exchange</h1>
        <p className="px-2 font-title text-xl text-zinc-300">The easiest way to raid.</p>
      </hgroup>
      <div className="max-w-sm mx-auto">
        <div className="bg-zinc-700/50 p-4 rounded-xl">
          <p className="max-w-xs mb-4 text-violet-100">
            Post your raid. <br />
            Share the link. <br />
            Put the code in once the party&apos;s full. <br />
            That&apos;s it.
          </p>
          <Link
            className="block text-center py-3 px-4 rounded-xl text-zinc-300 bg-violet-900"
            href={{ pathname: user ? "/host" : "/login", query: { to: "/" } }}
          >
            Host Now
          </Link>
        </div>
      </div>
    </>
  );
}
