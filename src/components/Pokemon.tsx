import pokeApi from "~/utils/pokemon-client";
import { Pokemon as IPokemon } from "pokenode-ts";
import { useEffect, useState } from "react";

import Clefairy from "$/clefairy.png";
import Image from "next/image";
import clsx from "clsx";

export default function Pokemon({ className, name }: { className?: string; name?: string | null }) {
  const [pokemon, setPokemon] = useState<IPokemon>();

  useEffect(() => {
    if (name) pokeApi.pokemon.getPokemonByName(name).then((pokemon) => setPokemon(pokemon));
  }, [name]);

  const src = pokemon?.sprites.other?.["official-artwork"].front_default ?? pokemon?.sprites.front_default;

  return (
    <div className={clsx("flex items-center justify-center", className)}>
      <div className="relative h-full w-full rounded-3xl overflow-hidden">
        <Image unoptimized fill priority alt="Pokemon image" src={src ?? Clefairy} />
      </div>
    </div>
  );
}
