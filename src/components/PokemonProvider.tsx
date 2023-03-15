"use client";

import { Item, NamedAPIResource } from "pokenode-ts";
import { createContext, ReactNode } from "react";

interface PokemonState {
  pokemon: NamedAPIResource[];
  items: NamedAPIResource[];
  rewards: Item[];
}

export const PokemonContext = createContext<Partial<PokemonState>>(undefined!);

export default function PokemonProvider({
  value,
  children,
}: {
  children: ReactNode;
  value: PokemonState;
}) {
  return (
    <PokemonContext.Provider value={value}>{children}</PokemonContext.Provider>
  );
}
