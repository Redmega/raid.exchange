"use client";

import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import AuthHeader from "~/components/AuthHeader";
import { useSupabaseClient } from "~/utils/supabase-client";
import Logo from "$/logo.png";
import { NamedAPIResource } from "pokenode-ts";
import { useState } from "react";
import PokemonCombobox from "~/components/PokemonCombobox";
import Pokemon from "~/components/Pokemon";
import Stars from "~/components/Stars";

export default function Host({
  pokemonList,
}: {
  pokemonList: NamedAPIResource[];
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [pokemon, setPokemon] = useState<NamedAPIResource>();
  const [stars, setStars] = useState(5);

  return (
    <main className="relative h-full w-full flex flex-col items-center justify-center">
      <AuthHeader />
      <hgroup className="mb-8 text-center">
        <Image
          className="h-24 w-24 mx-auto"
          alt="Raid.Exchange Logo"
          src={Logo}
        />
        <h1 className="font-title font-bold text-2xl sm:text-4xl text-zinc-100 leading-relaxed">
          Create a Lobby
        </h1>
      </hgroup>
      <form className="w-full max-w-screen-sm rounded-xl bg-purple-900 p-2">
        <div className="flex gap-2 mb-2">
          <div className="w-full max-w-[theme(spacing.56)]">
            <Stars onChange={setStars} />
            <Pokemon className="mb-2" name={pokemon?.name} />
            <PokemonCombobox onChange={setPokemon} pokemonList={pokemonList} />
          </div>
          <div className="grow w-full rounded-lg overflow-hidden">
            <textarea
              className="outline-none bg-zinc-900/50 p-2 h-full w-full resize-none placeholder:text-purple-300"
              placeholder="Enter your description. Include things like the poke you have, strategies, etc."
              maxLength={256}
            />
          </div>
        </div>
        <div className="w-full">
          <hgroup className="w-full flex items-baseline gap-1 flex-wrap">
            <h4 className="font-title font-bold text-xl tracking-wide text-zinc-300">
              Rewards
            </h4>
            <span className="text-sm text-purple-300">
              If known, otherwise leave blank.
            </span>
          </hgroup>
          <div>TODO: reward picker</div>
        </div>
      </form>
    </main>
  );
}
