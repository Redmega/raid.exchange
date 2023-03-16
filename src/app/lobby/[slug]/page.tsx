import "server-only";
import { createClient } from "~/utils/supabase-server";
import LobbyPage from "./lobby-page";
import { notFound, redirect } from "next/navigation";
import { Database } from "~/lib/database.types";
import { cache } from "react";
import { omit } from "lodash-es";
import { unSlugify } from "~/utils/pokemon-client";
import { Metadata } from "next";

export type Lobby = Database["public"]["Tables"]["lobby"]["Row"];
export type Profile = Database["public"]["Tables"]["profile"]["Row"];
export type LobbyUser = Database["public"]["Tables"]["lobby_users"]["Row"] & { profile: Profile };

export const revalidate = 0;

const getLobby = cache(async (slug: string) => {
  const supabase = createClient();

  const response = await supabase
    .from("lobby")
    .select(`*, profile:host_id (*), lobby_users (*, profile:user_id (*))`)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (!response.data) return redirect("/");

  const profile = response.data.profile as Profile;
  const lobby_users = response.data.lobby_users as LobbyUser[];
  const lobby = omit(response.data, ["profile", "lobby_users"]);

  return { profile, lobby_users, lobby };
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { lobby, profile } = await getLobby(params.slug);
  return {
    title: `${lobby.stars}★ ${unSlugify(lobby.pokemon_name ?? "random")} raid, hosted by ${profile.username}`,
    description: lobby.description || "Join now!",
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { lobby, profile, lobby_users } = await getLobby(params.slug);
  return <LobbyPage lobby={lobby} host={profile} queue={lobby_users} />;
}
