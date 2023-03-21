"use client";

import { useUser } from "@supabase/auth-helpers-react";
import { useSupabaseClient } from "~/utils/supabase-client";
import { Profile, Lobby as ILobby, LobbyUser } from "./page";
import { unSlugify } from "~/utils/pokemon-client";
import Pokemon from "~/components/Pokemon";
import User from "~/components/User";
import {
  FocusEvent,
  MouseEvent,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Transition } from "@headlessui/react";
import PokemonCombobox from "~/components/PokemonCombobox";
import { PokemonContext } from "~/components/PokemonProvider";
import { NamedAPIResource } from "pokenode-ts";
import { usePathname, useRouter } from "next/navigation";
import { useOnClickOutside } from "usehooks-ts";
import { omit, times } from "lodash-es";
import Image from "next/image";
import clsx from "clsx";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

type RaidPhase = "waiting" | "started";

export default function Lobby({
  host,
  lobby: serverLobby,
  queue: serverQueue,
}: {
  lobby: ILobby;
  host: Profile;
  queue: LobbyUser[];
}) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();

  const [showPickPokemon, setShowPickPokemon] = useState(false);

  const { pokemon: pokemonList } = useContext(PokemonContext);

  const [lobby, setLobby] = useState(serverLobby);

  const [code, setCode] = useState(lobby.code ?? "");

  const [queue, setQueue] = useState(serverQueue);
  const self = useMemo(() => queue.find((lu) => lu.user_id === user?.id), [queue, user?.id]);
  const [party, waiting] = useMemo(() => [queue.slice(0, 4), queue.slice(4)], [queue]);

  const isHost = user?.id === host.user_id;
  const isMember = !!self;
  const isParty = !!party.find((lu) => lu.user_id === user?.id);

  const pathname = usePathname();
  const [url, setUrl] = useState(pathname);

  useEffect(() => {
    setUrl(window.location.origin + pathname);
  }, [pathname]);

  const [showCopied, setShowCopied] = useState(false);
  const handleCopyLink = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
    document.execCommand("copy");
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 500);
    event.currentTarget.setSelectionRange(0, 0);
    event.currentTarget.blur();
  }, []);

  const [phase, setPhase] = useState<RaidPhase>(lobby.code ? "started" : "waiting");

  const handleStartRaid = useCallback(
    async (e?: SyntheticEvent) => {
      e?.preventDefault();
      const response = await supabase.from("lobby").update({ code: code.toUpperCase() }).eq("id", lobby.id);
      if (response.error) console.error(response.error);
    },
    [code, lobby.id, supabase]
  );

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
  }, [user, supabase, url, lobby.id]);

  const handleLeave = useCallback(async () => {
    if (!user) return;
    setIsRejoining(false);
    const response = await supabase.from("lobby_users").delete().eq("lobby_id", lobby.id).eq("user_id", user.id);
    if (response.error) console.error(response.error);
  }, [lobby.id, supabase, user]);

  const handleRemoveUser = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      const userId = event.currentTarget.value;
      const response = await supabase.from("lobby_users").delete().eq("lobby_id", lobby.id).eq("user_id", userId);
      if (response.error) console.error(response.error);
    },
    [lobby.id, supabase]
  );

  const handleReset = useCallback(async () => {
    const response = await supabase.from("lobby").update({ code: null }).eq("id", lobby.id);
    if (response.error) console.error(response.error);
    else {
      setCode("");
      setPhase("waiting");
    }
  }, [lobby.id, supabase]);

  const handleNext = useCallback(async () => {
    // Remove everyone in the party (besides the host)
    let response = await supabase
      .from("lobby_users")
      .delete()
      .eq("lobby_id", lobby.id)
      .in(
        "user_id",
        party.map((lu) => lu.user_id).filter((id) => id !== host.user_id)
      );
    if (response.error) console.error(response.error);
    else {
      const response = await supabase.from("lobby").update({ code: null }).eq("id", lobby.id);
      if (response.error) console.error(response.error);
      setCode("");
    }
  }, [host.user_id, lobby.id, party, supabase]);

  const handleEnd = useCallback(async () => {
    const response = await supabase.from("lobby").delete().eq("id", lobby.id);
    if (response.error) console.error(response.error);
    else {
      router.push("/host");
    }
  }, [lobby.id, router, supabase]);

  /**
   * Live updates
   */
  const [presence, setPresence] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!user?.id) return;

    let heartbeat: number;
    const channel = supabase
      .channel(`lobby:${lobby.slug}`, { config: { presence: { key: user.id } } })
      .on("presence", { event: "sync" }, () => {
        setPresence((presence) => ({ ...presence, ...channel.presenceState() }));
      })
      .on("presence", { event: "join" }, (payload) => {
        setPresence((presence) => ({ ...presence, [payload.key]: payload.newPresences }));
      })
      .on("presence", { event: "leave" }, (payload) => {
        setPresence((presence) => omit(presence, payload.key));
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_users",
          filter: `lobby_id=eq.${lobby.id}`,
        },
        async (payload) => {
          switch (payload.eventType) {
            case "INSERT": {
              const record = payload.new as LobbyUser;
              await supabase
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
          setLobby(payload.new as ILobby);
          setPhase((phase) => (record.code && phase === "waiting" ? "started" : "waiting"));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "lobby",
          filter: `id=eq.${lobby.id}`,
        },
        () => {
          router.push("/host");
        }
      )
      .subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            last_online: new Date().toISOString(),
          });
        }
      });

    return () => {
      window.clearInterval(heartbeat);
      Promise.all([channel.untrack(), supabase.removeChannel(channel)]);
    };
  }, [lobby.id, lobby.slug, router, supabase, user?.id]);

  const chooseModalRef = useRef<HTMLElement>(null);
  useOnClickOutside(
    chooseModalRef,
    useCallback(() => {
      setShowPickPokemon(false);
    }, [])
  );

  const [isRejoining, setIsRejoining] = useState(false);

  useEffect(() => {
    if (isRejoining && !isMember) handleJoin();
  }, [isRejoining, isMember, handleJoin]);

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
      <section className="max-w-sm mx-auto">
        {lobby.description && (
          <div className="bg-zinc-900/50 py-2 px-4 rounded-xl mb-4">
            <p className="whitespace-pre-wrap">{lobby.description}</p>
          </div>
        )}
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
                {isHost && user_id !== user?.id && (
                  <button
                    className="absolute p-2 rounded-full bg-zinc-900/75 opacity-0 hover:opacity-100 transition"
                    disabled={user?.id !== host.user_id}
                    onClick={handleRemoveUser}
                    value={user_id}
                  >
                    <XMarkIcon className="fill-red-500 h-8 w-8" />
                  </button>
                )}
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
        {(isHost || phase === "started") && isParty && (
          <hgroup className="w-full flex items-baseline gap-1 flex-wrap mb-2">
            <h2 className="font-title font-bold text-xl tracking-wide text-zinc-300">Code</h2>
            {phase === "waiting" && isHost && (
              <small className="text-sm text-violet-300">
                When you&apos;re ready, host the raid and fill in the code below
              </small>
            )}
          </hgroup>
        )}
        <div className="grid grid-cols-2 grid-flow-row gap-2">
          {phase === "waiting" && isHost && (
            <>
              <form onSubmit={handleStartRaid}>
                <input
                  autoFocus
                  className="text-center tracking-[.25em] uppercase text-2xl max-w-[calc(6ch+theme(spacing.24))] w-full px-4 py-1 rounded-lg bg-zinc-900/50 focus:outline-none border-2 border-transparent focus:border-purple-900 transition"
                  name="code"
                  value={code}
                  placeholder="XXXXXX"
                  maxLength={6}
                  onChange={(e) => setCode(e.currentTarget.value)}
                />
                <button className="hidden" type="submit" />
              </form>
              <button
                className="w-full rounded-lg bg-violet-700 py-2 px-4 font-bold font-title tracking-widest disabled:opacity-25 disabled:cursor-not-allowed"
                disabled={code.length < 6}
                onClick={handleStartRaid}
              >
                Start
              </button>
            </>
          )}
          {phase === "started" && (
            <>
              {isParty && (
                <p className="w-full rounded-xl text-2xl font-title tracking-[.25em] text-center px-4 py-2 bg-zinc-900/50">
                  {lobby.code}
                </p>
              )}
              {isHost && (
                <>
                  <button
                    className={clsx(
                      "w-full rounded-lg py-2 px-4 font-bold font-title tracking-widest disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-colors border border-purple-300 text-purple-300 bg-zinc-700/25",
                      "hover:bg-zinc-700/50 hover:border-yellow-500/50 hover:text-yellow-500"
                    )}
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                  <button
                    className="w-full rounded-lg bg-red-700 py-2 px-4 font-bold font-title tracking-widest disabled:opacity-25 disabled:cursor-not-allowed"
                    onClick={handleEnd}
                  >
                    Quit
                  </button>
                  <button
                    className="w-full rounded-lg bg-green-700 py-2 px-4 font-bold font-title tracking-widest disabled:opacity-25 disabled:cursor-not-allowed"
                    onClick={handleNext}
                  >
                    Rehost
                  </button>
                </>
              )}
            </>
          )}
          {!isHost && isMember && (
            <>
              <button
                className={clsx(
                  "w-full rounded-lg py-2 px-4 font-bold font-title tracking-widest disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors border border-purple-300 text-purple-300 bg-zinc-700/25",
                  "hover:bg-zinc-700/50 hover:border-red-500/50 hover:text-red-500"
                )}
                onClick={handleLeave}
              >
                Leave
              </button>
              <label
                className={clsx(
                  "flex items-center justify-center gap-2 w-full text-sm rounded-lg py-2 px-4 font-bold font-title tracking-widest disabled:opacity-25 disabled:cursor-not-allowed",
                  "text-violet-300"
                )}
              >
                <input hidden type="checkbox" onChange={(e) => setIsRejoining(e.currentTarget.checked)} />
                <CheckIcon
                  className={clsx(
                    "border border-violet-300 rounded py-px h-4 w-4 transition",
                    !isRejoining && "text-transparent"
                  )}
                />
                Auto Rejoin
              </label>
            </>
          )}
        </div>
      </section>
    </>
  );
}
