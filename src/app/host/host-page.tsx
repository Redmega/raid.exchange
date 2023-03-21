"use client";

import { FormEvent, MouseEvent, useCallback, useContext, useState } from "react";
import { generateRandomSlug, unSlugify } from "~/utils/pokemon-client";
import { NamedAPIResource } from "pokenode-ts";
import { PokemonContext } from "~/components/PokemonProvider";
import { Transition } from "@headlessui/react";
import { times } from "lodash-es";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseClient } from "~/utils/supabase-client";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import Logo from "$/logo.png";
import LoadingIcon from "$/load.svg";
import Pokemon from "~/components/Pokemon";
import PokemonCombobox from "~/components/PokemonCombobox";
import Stars from "~/components/Stars";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";

export default function Host() {
  const url = window.location.origin + usePathname();

  const { rewards: itemList, pokemon: pokemonList } = useContext(PokemonContext);
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const savedData = window.localStorage.getItem("RE_SAVED_LOBBY");
  const parsedData = savedData ? JSON.parse(savedData) : undefined;

  const [repeat, setRepeat] = useState(true);
  const [stars, setStars] = useState(parsedData?.stars ?? 5);
  const [pokemon, setPokemon] = useState<NamedAPIResource>(parsedData?.pokemon ?? undefined);
  const [description, setDescription] = useState(parsedData?.description ?? "");
  const [rewards, setRewards] = useState<Record<string, number>>(parsedData?.rewards ?? {});

  const handleItemAdded = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const name = event.currentTarget.value;
    setRewards((items) => ({ ...items, [name]: (items[name] ?? 0) + 1 }));
  }, []);

  const handleItemRemoved = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const name = event.currentTarget.value;
    setRewards((items) => ({ ...items, [name]: items[name] - 1 }));
  }, []);

  const [loading, setLoading] = useState(false);
  const handleCreateLobby = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      setLoading(true);
      event.preventDefault();
      // Save our data so we can check it when we come back
      window.localStorage.setItem(
        "RE_SAVED_LOBBY",
        JSON.stringify({
          pokemon,
          stars,
          rewards,
          repeat,
          description,
        })
      );
      if (!user)
        return supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            scopes: "identify",
            redirectTo: url,
          },
        });

      // Generate a random slug firmness-softness-flavor-berries
      let slug: string | undefined;
      while (slug === undefined) {
        slug = generateRandomSlug();
        // check if generated slug exists
        const response = await supabase.from("lobby").select("slug", { count: "exact" }).eq("slug", slug).limit(1);
        if (response.count === 1) slug = undefined;
      }

      const response = await supabase
        .from("lobby")
        .insert({
          slug,
          stars,
          description,
          pokemon_name: pokemon.name,
          repeat,
          rewards,
          host_id: user.id,
        })
        .select()
        .single();

      if (response.error) {
        console.error(response.error);
        setLoading(false);
        return;
      }

      // Add user to queue
      await supabase.from("lobby_users").insert({
        lobby_id: response.data.id,
        user_id: user.id,
      });

      return router.push(`/lobby/${slug}`);
    },
    [description, pokemon, repeat, rewards, router, stars, supabase, url, user]
  );

  return (
    <>
      <hgroup className="mb-8 text-center">
        <Image className="h-24 w-24 mx-auto" alt="Raid.Exchange Logo" src={Logo} />
        <h1 className="font-title font-bold text-2xl sm:text-4xl text-zinc-100 leading-relaxed">Create a Lobby</h1>
      </hgroup>
      <form className="mx-auto w-full max-w-screen-sm rounded-xl bg-violet-900 p-2" onSubmit={handleCreateLobby}>
        <div className="flex flex-col items-center sm:items-stretch sm:flex-row gap-2 mb-4">
          <div className="w-full max-w-[theme(spacing.56)]">
            <Stars stars={stars} onChange={setStars} />
            <Pokemon className="h-32 w-32 mx-auto mb-2" name={pokemon?.name} />
            <PokemonCombobox selectedPokemon={pokemon} onChange={setPokemon} pokemonList={pokemonList!} />
          </div>
          <div className="grow w-full rounded-lg overflow-hidden">
            <textarea
              className="outline-none bg-zinc-900/50 p-2 h-full w-full resize-none placeholder:text-violet-300"
              placeholder="Enter your description. Include things like the poke you have, strategies, etc."
              maxLength={256}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
        </div>
        <section className="w-full mb-2">
          <hgroup className="w-full flex items-baseline gap-1 flex-wrap mb-1">
            <h4 className="font-title font-bold text-xl tracking-wide text-zinc-300">Rewards</h4>
            <small className="text-sm text-violet-300">Click to add if known, otherwise leave blank.</small>
          </hgroup>
          <div className="flex flex-wrap max-w-full justify-start w-full rounded-3xl p-2 gap-1 bg-zinc-900/25 h-14 sm:h-20 overflow-auto mb-1">
            {Object.entries(rewards).map(([name, count]) => {
              const item = itemList!.find((item) => item.name === name)!;

              return times(count, (i) => (
                <Transition
                  appear
                  show
                  enter="transition duration-300"
                  leave="transition duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  as="button"
                  key={"" + item.id + i}
                  className="group/button flex items-center justify-center relative w-10 h-10 sm:w-16 sm:h-16 rounded-3xl"
                  title={unSlugify(item.name)}
                  type="button"
                  onClick={handleItemRemoved}
                  value={item.name}
                >
                  <XMarkIcon className="transition group-hover/button:opacity-100 opacity-0 text-red-500 z-10" />
                  <Image
                    className="transition group-hover/button:opacity-50 opacity-100 z-0"
                    unoptimized
                    fill
                    alt={item.name}
                    src={`/items/${item.name}.png`}
                  />
                </Transition>
              ));
            })}
          </div>
          <div className="flex flex-wrap justify-between sm:justify-start p-2 gap-1">
            {itemList!.map((item) => (
              <button
                key={item.id}
                className="relative w-10 h-10 sm:w-16 sm:h-16 rounded-3xl last-of-type:mr-auto"
                title={unSlugify(item.name)}
                type="button"
                onClick={handleItemAdded}
                value={item.name}
              >
                <Image unoptimized fill alt={item.name} src={`/items/${item.name}.png`} />
              </button>
            ))}
          </div>
        </section>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center justify-center w-full rounded-lg bg-violet-700 py-2 px-4 max-w-[theme(spacing.32)] font-bold font-title tracking-widest"
            disabled={loading}
          >
            {loading ? <LoadingIcon className="text-violet-300/25 animate-spin h-5 w-5 m-0.5" /> : "Go"}
          </button>
        </div>
      </form>
    </>
  );
}
