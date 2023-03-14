import { PokemonClient, ItemClient } from "pokenode-ts";

const pokeApi = {
  items: new ItemClient(),
  pokemon: new PokemonClient(),
};

export default pokeApi;

export function unSlugify(name: string) {
  const parts = name.split("-");

  return parts.join(" ");
}
