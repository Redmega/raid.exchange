"use client";

import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import Logo from "$/logo.png";
import AuthHeader from "~/components/AuthHeader";
import { useSupabaseClient } from "~/utils/supabase-client";
import { Profile, Lobby as ILobby, LobbyUser } from "./page";
import { unSlugify } from "~/utils/pokemon-client";
import Pokemon from "~/components/Pokemon";
import User from "~/components/User";
import { useCallback, useContext, useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import PokemonCombobox from "~/components/PokemonCombobox";
import { PokemonContext } from "~/components/PokemonProvider";
import { NamedAPIResource } from "pokenode-ts";

export default function Lobby({
  lobby,
  host,
  queue: serverQueue,
}: {
  lobby: ILobby;
  host: Profile;
  queue: LobbyUser[];
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [pokemonPickerOpen, setPokemonPickerOpen] = useState(false);

  const { pokemon } = useContext(PokemonContext);

  const [queue, setQueue] = useState(serverQueue);

  const handleSelectedPokemonChange = useCallback(
    (pokemon: NamedAPIResource) => {
      supabase
        .from("lobby_users")
        .update({
          pokemon_name: pokemon.name,
        })
        .eq("lobby_id", lobby.id)
        .then((response) => {
          if (!response.error) setPokemonPickerOpen(false);
        });
    },
    [lobby.id, supabase]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`lobby:${lobby.slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_users",
          filter: `lobby_id=eq.${lobby.id}`,
        },
        (payload) => {
          switch (payload.eventType) {
            case "UPDATE": {
              setQueue((users) =>
                users.map((lu) =>
                  lu.user_id === payload.new.user_id ? { ...lu, pokemon_name: payload.new.pokemon_name } : lu
                )
              );
              break;
            }
            case "INSERT": {
              const record = payload.new as LobbyUser;
              // fetch profile here
              supabase
                .from("profile")
                .select("*")
                .eq("user_id", record.user_id)
                .single()
                .then(({ error, data }) => {
                  if (error) console.error(error);
                  else setQueue((users) => users.concat({ ...record, profile: data }));
                });
              break;
            }
            case "DELETE": {
              const record = payload.old as Pick<LobbyUser, "user_id" | "lobby_id">;

              setQueue((users) => users.filter((lu) => lu.user_id !== record.user_id));
              break;
            }
          }
        }
      )
      .subscribe((status, error) => {
        console.log({ status, error });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobby.id, lobby.slug, supabase]);

  return (
    <>
      <AuthHeader />
      <Transition
        show={pokemonPickerOpen}
        enter="transition duration-300"
        leave="transition duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <aside className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="p-4 bg-violet-900 rounded-xl shadow-2xl max-w-xs w-full">
            <hgroup className="mb-2">
              <h3 className="text-lg font-title tracking-wider leading-relaxed">Select your Pokemon</h3>
              <span className="text-sm text-violet-300">
                Let your party know what you plan to use so you can more easily plan your strategy
              </span>
            </hgroup>
            <PokemonCombobox autoFocus onChange={handleSelectedPokemonChange} pokemonList={pokemon!} />
          </div>
        </aside>
      </Transition>
      <hgroup className="mb-8 text-center">
        <Pokemon className="h-32 w-32 mx-auto" name={lobby.pokemon_name} />
        <h1 className="font-title font-bold text-2xl sm:text-4xl text-zinc-100 leading-relaxed">{`${
          lobby.stars
        }★ ${unSlugify(lobby.pokemon_name ?? "random")}`}</h1>
      </hgroup>
      <div className="bg-zinc-900/50 py-2 px-4 rounded-xl max-w-sm mb-4">
        <p className="whitespace-pre-wrap">{lobby.description}</p>
      </div>
      <div className="w-full max-w-sm bg-violet-900/50 p-2 rounded-xl flex flex-col gap-1">
        {queue.map(({ pokemon_name, profile: { avatar_url, username }, user_id }) => (
          <div key={user_id} className="flex items-center justify-between gap-4 rounded-xl p-2 odd:bg-zinc-900/50">
            <User avatar={avatar_url} username={username} />
            <button disabled={user?.id !== user_id} onClick={() => setPokemonPickerOpen(true)}>
              <Pokemon className="h-16 w-16" name={pokemon_name} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
