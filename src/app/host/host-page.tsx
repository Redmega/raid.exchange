"use client";

import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import AuthHeader from "~/components/AuthHeader";
import { useSupabaseClient } from "~/utils/supabase-client";
import Logo from "$/logo.png";
import { Item, NamedAPIResource } from "pokenode-ts";
import { MouseEvent, useCallback, useState } from "react";
import PokemonCombobox from "~/components/PokemonCombobox";
import Pokemon from "~/components/Pokemon";
import Stars from "~/components/Stars";
import { unSlugify } from "~/utils/pokemon-client";
import { times } from "lodash-es";
import XMarkIcon from "@heroicons/react/24/solid/XMarkIcon";
import { Transition } from "@headlessui/react";

export default function Host({
  itemList,
  pokemonList,
}: {
  itemList: Item[];
  pokemonList: NamedAPIResource[];
}) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [pokemon, setPokemon] = useState<NamedAPIResource>();
  const [stars, setStars] = useState(5);
  const [items, setItems] = useState<Record<string, number>>({});

  const handleItemAdded = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const name = event.currentTarget.value;
      setItems((items) => ({ ...items, [name]: (items[name] ?? 0) + 1 }));
    },
    []
  );

  const handleItemRemoved = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const name = event.currentTarget.value;
      setItems((items) => ({ ...items, [name]: items[name] - 1 }));
    },
    []
  );

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
      <form className="w-full max-w-screen-sm rounded-xl bg-violet-900 p-2">
        <div className="flex gap-2 mb-2">
          <div className="w-full max-w-[theme(spacing.56)]">
            <Stars onChange={setStars} />
            <Pokemon className="mb-2" name={pokemon?.name} />
            <PokemonCombobox onChange={setPokemon} pokemonList={pokemonList} />
          </div>
          <div className="grow w-full rounded-lg overflow-hidden">
            <textarea
              className="outline-none bg-zinc-900/50 p-2 h-full w-full resize-none placeholder:text-violet-300"
              placeholder="Enter your description. Include things like the poke you have, strategies, etc."
              maxLength={256}
            />
          </div>
        </div>
        <section className="w-full mb-4">
          <hgroup className="w-full flex items-baseline gap-1 flex-wrap mb-1">
            <h4 className="font-title font-bold text-xl tracking-wide text-zinc-300">
              Rewards
            </h4>
            <span className="text-sm text-violet-300">
              If known, otherwise leave blank.
            </span>
          </hgroup>
          <div className="flex flex-wrap max-w-full justify-start w-full rounded-3xl p-2 gap-1 bg-zinc-900/25 h-14 sm:h-20 overflow-auto mb-1">
            {Object.entries(items).map(([name, count]) => {
              const item = itemList.find((item) => item.name === name)!;

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
            {itemList.map((item) => (
              <button
                key={item.id}
                className="relative w-10 h-10 sm:w-16 sm:h-16 rounded-3xl last-of-type:mr-auto"
                title={unSlugify(item.name)}
                type="button"
                onClick={handleItemAdded}
                value={item.name}
              >
                <Image
                  unoptimized
                  fill
                  alt={item.name}
                  src={`/items/${item.name}.png`}
                />
              </button>
            ))}
          </div>
        </section>
        <button className="block w-full rounded-xl bg-violet-500 py-2 px-4 ml-auto max-w-[theme(spacing.32)]">
          Go
        </button>
      </form>
    </main>
  );
}
