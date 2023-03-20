"use client";

import { useUser } from "@supabase/auth-helpers-react";
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
import { times } from "lodash-es";
import Image from "next/image";
import clsx from "clsx";

type RaidPhase = "waiting" | "started";

// const TEST_USERS: LobbyUser[] = [
//   {
//     user_id: "a",
//     pokemon_name: "umbreon",
//     profile: { avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png", username: "Some User", user_id: "a" },
//   },
//   {
//     user_id: "b",
//     pokemon_name: "vaporeon",
//     profile: { avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png", username: "Another User", user_id: "b" },
//   },
//   {
//     user_id: "c",
//     profile: { avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png", username: "A Queue User", user_id: "c" },
//   },
//   {
//     user_id: "d",
//     profile: {
//       avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png",
//       username: "Another Queue User",
//       user_id: "d",
//     },
//   },
// ];

export default function Lobby({
  host,
  lobby: serverLobby,
  queue: serverQueue,
}: {
  lobby: ILobby;
  host: Profile;
  queue: LobbyUser[];
}) {
  const url = window.location.origin + usePathname();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [showPickPokemon, setShowPickPokemon] = useState(false);

  const { pokemon: pokemonList } = useContext(PokemonContext);

  const [lobby, setLobby] = useState(serverLobby);

  const [code, setCode] = useState(lobby.code ?? "");

  const [queue, setQueue] = useState(serverQueue);
  const self = useMemo(() => queue.find((lu) => lu.user_id === user?.id), [queue, user?.id]);
  const [party, waiting] = useMemo(() => [queue.slice(0, 4), queue.slice(4)], [queue]);

  console.log({ party, waiting });

  const isHost = user?.id === host.user_id;
  const isMember = !!self;

  const [phase, setPhase] = useState<RaidPhase>("waiting");

  const handleStartRaid = useCallback(async () => {
    const response = await supabase.from("lobby").update({ code: code.toUpperCase() }).eq("id", lobby.id);
    if (response.error) console.error(response.error);
    else {
      setPhase("started");
    }
  }, [code, lobby.id, supabase]);

  const handleSelectedPokemonChange = useCallback(
    async (pokemon: NamedAPIResource) => {
      const response = await supabase
        .from("lobby_users")
        .update({
          pokemon_name: pokemon.name,
        })
        .eq("lobby_id", lobby.id);

      if (!response.error) setShowPickPokemon(false);
      else console.error(response.error);
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

  const handleJoin = useCallback(async () => {
    if (!user)
      return supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          scopes: "identify",
          redirectTo: url,
        },
      });

    const response = await supabase.from("lobby_users").insert({ lobby_id: lobby.id, user_id: user.id });
    if (response.error) console.error(response.error);
  }, [lobby.id, supabase, url, user]);

  const handleLeave = useCallback(async () => {
    if (!user) return;
    const response = await supabase.from("lobby_users").delete().eq("lobby_id", lobby.id).eq("user_id", user.id);
    if (response.error) console.error(response.error);
  }, [lobby.id, supabase, user]);

  /**
   * Live updates
   */
  const [presence, setPresence] = useState<Record<string, any>>({});
  const channel = useRef<ReturnType<typeof supabase.channel>>();
  useEffect(() => {
    if (!user?.id) return;

    let heartbeat: number;
    channel.current = supabase
      .channel(`lobby:${lobby.slug}`, { config: { presence: { key: user.id } } })
      .on("presence", { event: "sync" }, () => {
        setPresence({ ...channel.current!.presenceState() });
      })
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lobby",
          filter: `id=eq.${lobby.id}`,
        },
        (payload) => {
          const record = payload.new as ILobby;
          const old = payload.old as ILobby;

          if (record.code && !old.code && phase === "waiting") setPhase("started");
          setLobby(payload.new as ILobby);
        }
      )
      .subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          await channel.current!.track({
            last_online: new Date().toISOString(),
          });
        }
      });

    return () => {
      window.clearInterval(heartbeat);

      if (channel.current) {
        Promise.all([channel.current.untrack(), supabase.removeChannel(channel.current)]);
      }
    };
  }, [lobby.id, lobby.slug, phase, supabase, user?.id]);

  const chooseModalRef = useRef<HTMLElement>(null);
  useOnClickOutside(
    chooseModalRef,
    useCallback(() => {
      setShowPickPokemon(false);
    }, [])
  );

  // TODO: Add controls for host to kick people
  // TODO: Host can see everyone queued up

  return (
    <>
      <Transition
        show={showPickPokemon}
        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/75"
        enter="transition duration-300"
        leave="transition duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <aside ref={chooseModalRef} className="p-4 md:p-8 bg-violet-900 rounded-xl shadow-2xl max-w-sm w-full">
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
        {lobby.rewards && (
          <>
            <hgroup className="w-full flex items-baseline gap-1 flex-wrap mb-2">
              <h2 className="font-title font-bold text-xl tracking-wide text-zinc-300">Rewards</h2>
              <small className="text-sm text-violet-300">Make sure to eat your sando&apos;s!</small>
            </hgroup>
            <div className="flex items-center gap-1 mb-2">
              {Object.entries(lobby.rewards).map(([name, count]) => {
                return times(count, (i) => (
                  <div key={"" + name + i} className="relative h-12 w-12" title={unSlugify(name)}>
                    <Image unoptimized fill alt={name} src={`/items/${name}.png`} />
                  </div>
                ));
              })}
            </div>
          </>
        )}
        <hgroup>
          <h2 className="font-title font-bold text-xl tracking-wide text-zinc-300 mb-2">Party</h2>
        </hgroup>
        <div className="w-full bg-violet-900/50 p-2 rounded-xl flex flex-col gap-1 mb-4">
          {party.map(({ user_id, pokemon_name, profile: { avatar_url, username } }) => {
            const presenceState = presence[user_id]?.[0];
            return (
              <div
                key={user_id}
                className="relative flex items-center justify-between gap-4 rounded-xl p-2 odd:bg-zinc-900/50"
              >
                <div
                  className={clsx(
                    "absolute top-2 left-2 w-2 h-2 transition-colors rounded-full",
                    presenceState && "bg-green-500"
                  )}
                />
                <User avatar={avatar_url} username={username} />
                <button disabled={user?.id !== user_id} onClick={() => setShowPickPokemon(true)}>
                  <Pokemon className="h-16 w-16" name={pokemon_name} />
                </button>
              </div>
            );
          })}
        </div>
        <div>
          {waiting.length > 0 && (
            <>
              <hgroup>
                <h2 className="font-title font-bold text-xl tracking-wide text-zinc-300 mb-2">Queue</h2>
              </hgroup>
              <div className="relative flex items-center rounded-xl p-2 bg-zinc-900/50 overflow-hidden pl-6 mb-4">
                {waiting.slice(0, 10).map(({ user_id, profile: { avatar_url, username } }) => (
                  <User className="-ml-4" key={user_id} avatar={avatar_url} username={username} onlyAvatar />
                ))}
                {waiting.length > 10 && (
                  <p className="ml-2 -mr-6 text-xs text-violet-300">And {waiting.length - 10} more...</p>
                )}
              </div>
            </>
          )}
        </div>
        {!queue.find((lu) => lu.user_id === user?.id) && (
          <div>
            <button
              className="block w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-widest"
              onClick={handleJoin}
              disabled={!lobby.repeat && party.length === 4}
            >
              {party.length < 4 && "Join Party"}
              {lobby.repeat && party.length === 4 && "Join Queue"}
              {!lobby.repeat && party.length === 4 && "Full"}
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
                className="w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-widest disabled:opacity-25 disabled:cursor-not-allowed"
                disabled={code.length < 6}
                onClick={handleStartRaid}
              >
                Start
              </button>
            </div>
          </>
        )}
        {!isHost && isMember && (
          <button
            className={clsx(
              "w-full rounded-lg py-2 px-4 font-bold font-title tracking-widest disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors bg-zinc-700/25 border-2 border-zinc-500/50 text-zinc-500",
              "hover:bg-zinc-700/50 hover:border-red-500/50 hover:text-red-500"
            )}
            onClick={handleLeave}
          >
            Leave
          </button>
        )}
      </section>
    </>
  );
}
