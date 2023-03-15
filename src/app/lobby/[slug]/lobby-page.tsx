"use client";

import { useUser } from "@supabase/auth-helpers-react";
import AuthHeader from "~/components/AuthHeader";
import { useSupabaseClient } from "~/utils/supabase-client";
import { Profile, Lobby as ILobby, LobbyUser } from "./page";
import { unSlugify } from "~/utils/pokemon-client";
import Pokemon from "~/components/Pokemon";
import User from "~/components/User";
import { FocusEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import PokemonCombobox from "~/components/PokemonCombobox";
import { PokemonContext } from "~/components/PokemonProvider";
import { NamedAPIResource } from "pokenode-ts";
import { usePathname } from "next/navigation";
import { useOnClickOutside } from "usehooks-ts";

export default function Lobby({
  lobby,
  host,
  queue: serverQueue,
}: {
  lobby: ILobby;
  host: Profile;
  queue: LobbyUser[];
}) {
  const url = location.origin + usePathname();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [showPickPokemon, setShowPickPokemon] = useState(false);

  const { pokemon: pokemonList } = useContext(PokemonContext);

  const [code, setCode] = useState(lobby.code ?? "");

  const [queue, setQueue] = useState(serverQueue);
  const self = useMemo(() => queue.find((lu) => lu.user_id === user?.id), [queue, user?.id]);
  const party = useMemo(() => queue.slice(0, 4), [queue]);

  const isHost = user?.id === lobby.host_id;

  const handleShareCode = useCallback(() => {
    supabase.from("lobby").update({ code: code.toUpperCase() }).eq("id", lobby.id);
  }, [code, lobby.id, supabase]);

  const handleSelectedPokemonChange = useCallback(
    (pokemon: NamedAPIResource) => {
      supabase
        .from("lobby_users")
        .update({
          pokemon_name: pokemon.name,
        })
        .eq("lobby_id", lobby.id)
        .then((response) => {
          if (!response.error) setShowPickPokemon(false);
        });
    },
    [lobby.id, supabase]
  );

  const [showCopied, setShowCopied] = useState(false);
  const handleCopyLink = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
    document.execCommand("copy");
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 500);
    event.currentTarget.setSelectionRange(0, 0);
    event.currentTarget.blur();
  }, []);

  const handleJoin = useCallback(() => {
    if (!user)
      return supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          scopes: "identify",
          redirectTo: window.location.toString(),
        },
      });

    supabase
      .from("lobby_users")
      .insert({ lobby_id: lobby.id, user_id: user.id })
      .then((response) => {
        if (response.error) console.error(response.error);
      });
  }, [lobby.id, supabase, user]);

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
            case "INSERT": {
              const record = payload.new as LobbyUser;
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
            case "UPDATE": {
              const record = payload.new as LobbyUser;
              setQueue((users) =>
                users.map((lu) => (lu.user_id === record.user_id ? { ...lu, pokemon_name: record.pokemon_name } : lu))
              );
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

  const chooseModalRef = useRef<HTMLElement>(null);
  useOnClickOutside(
    chooseModalRef,
    useCallback(() => {
      setShowPickPokemon(false);
    }, [])
  );

  // TODO: Add controls for host to kick people
  // TODO: Add controls for user to leave on their own
  // TODO: Only render top 4 of queue
  // TODO: Host can see everyone queued up
  // TODO: If you're not in the party, you cant see the party?

  return (
    <>
      <AuthHeader />
      <Transition
        show={showPickPokemon}
        className="fixed inset-0 z-50 flex items-center justify-center"
        enter="transition duration-300"
        leave="transition duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <aside ref={chooseModalRef} className="p-4 bg-violet-900 rounded-xl shadow-2xl max-w-xs w-full">
          <hgroup className="mb-2">
            <h3 className="text-lg font-title tracking-wider leading-relaxed">Select your Pokemon</h3>
            <span className="text-sm text-violet-300">
              Let your party know what you plan to use so you can more easily plan your strategy
            </span>
          </hgroup>
          <PokemonCombobox
            autoFocus
            onChange={handleSelectedPokemonChange}
            pokemonList={pokemonList!}
            selectedPokemon={self?.pokemon_name ? { name: self?.pokemon_name, url: "" } : undefined}
          />
        </aside>
      </Transition>
      <hgroup className="mb-4 text-center">
        <Pokemon className="h-32 w-32 mx-auto" name={lobby.pokemon_name} />
        <h1 className="font-title font-bold text-2xl sm:text-4xl text-zinc-100 leading-relaxed">{`${
          lobby.stars
        }★ ${unSlugify(lobby.pokemon_name ?? "random")}`}</h1>
      </hgroup>
      <section className="max-w-sm">
        <div className="bg-zinc-900/50 py-2 px-4 rounded-xl mb-4">
          <p className="whitespace-pre-wrap">{lobby.description}</p>
        </div>
        {isHost && (
          <div className="flex flex-col text-center mb-4">
            <span className="text-sm text-violet-300 mb-1">
              Share this link to invite other trainers to join your raid!
            </span>
            <div className="relative">
              <Transition
                appear
                show={showCopied}
                className="absolute inset-0 flex items-center justify-center bg-green-700 rounded-lg"
                enter="transition duration-300"
                leave="transition duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                Copied!
              </Transition>
              <input
                className="text-center text-sm select-text w-full px-4 py-2 rounded-lg bg-zinc-900/50 focus:outline-none border-2 border-transparent focus:border-purple-900 transition"
                readOnly
                value={url}
                onFocus={handleCopyLink}
              />
            </div>
          </div>
        )}
        <hgroup>
          <h2 className="text-xl font-bold font-title mb-2 text-zinc-300">Party</h2>
        </hgroup>
        <div className="w-full bg-violet-900/50 p-2 rounded-xl flex flex-col gap-1 mb-4">
          {party.map(({ pokemon_name, profile: { avatar_url, username }, user_id }) => (
            <div key={user_id} className="flex items-center justify-between gap-4 rounded-xl p-2 odd:bg-zinc-900/50">
              <User avatar={avatar_url} username={username} />
              <button disabled={user?.id !== user_id} onClick={() => setShowPickPokemon(true)}>
                <Pokemon className="h-16 w-16" name={pokemon_name} />
              </button>
            </div>
          ))}
        </div>
        {!queue.find((lu) => lu.user_id === user?.id) && (
          <div>
            <button
              className="block w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-widest"
              onClick={handleJoin}
            >
              Join
            </button>
          </div>
        )}
        {isHost && (
          <>
            <hgroup className="w-full flex items-baseline gap-1 flex-wrap mb-2">
              <h2 className="font-title font-bold text-xl tracking-wide text-zinc-300">Code</h2>
              <small className="text-sm text-violet-300">
                When you&apos;re ready, host the raid and fill in the code below
              </small>
            </hgroup>
            <div className="flex gap-2">
              <label className="shrink-0">
                <input
                  className="text-center tracking-widest uppercase text-xl max-w-[calc(6ch+theme(spacing.24))] select-text w-full px-4 py-1 rounded-lg bg-zinc-900/50 focus:outline-none border-2 border-transparent focus:border-purple-900 transition"
                  name="code"
                  value={code}
                  placeholder="XXXXXX"
                  maxLength={6}
                  onChange={(e) => setCode(e.currentTarget.value)}
                />
              </label>
              <button
                className="w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={code.length < 6}
                onClick={handleShareCode}
              >
                Share
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
