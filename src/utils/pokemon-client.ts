import {
  PokemonClient,
  ItemClient,
  NamedAPIResource,
  ContestTypes,
  BerryFirmnesses,
  BerryFlavors,
  Berries,
  PokemonHabitats,
} from "pokenode-ts";
import { cache } from "react";

const pokeApi = {
  items: new ItemClient(),
  pokemon: new PokemonClient(),
};

export default pokeApi;

export function unSlugify(name: string) {
  return name
    .replace(/\-|_/g, " ")
    .replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
}

async function getPokemonList() {
  const res = await pokeApi.pokemon.listPokemons(undefined, 9999);
  return res.results;
}

async function getItemList() {
  const res = await pokeApi.items.listItems(undefined, 9999);
  return res.results;
}

export async function getPokemon(name: string) {
  const res = await pokeApi.pokemon.getPokemonByName(name);
  return res;
}

async function getRewards(items: NamedAPIResource[]) {
  return Promise.all(
    items.filter((item) => /herba|bottle-cap/.test(item.name)).map((item) => pokeApi.items.getItemByName(item.name))
  );
}

export const buildPokemonContext = cache(async () => {
  const pokemon = await getPokemonList();
  const items = await getItemList();
  const rewards = await getRewards(items);

  return {
    pokemon,
    items,
    rewards,
  };
});

export function generateRandomSlug() {
  const habitat = pickRandomFromEnum(PokemonHabitats);
  const softness = pickRandomFromEnum(BerryFirmnesses);
  const flavor = pickRandomFromEnum(BerryFlavors);
  const contest = pickRandomFromEnum(ContestTypes);
  const berry = pickRandomFromEnum(Berries);

  return unSlugify(`${softness}-${flavor}-${contest}-${habitat}-${berry}`).replace(/\s/g, "");
}

function pickRandomFromEnum<T extends {}>(e: T): T[keyof T] {
  const values = Object.values(e).filter((v) => typeof v === "string") as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}
