import pokemonClient from "~/utils/pokemon-client";
import HostPage from "./host-page";

async function getPokemonList() {
  const res = await pokemonClient.listPokemons(undefined, 9999);
  return res.results;
}

export default async function Page() {
  const pokemonList = await getPokemonList();
  return <HostPage pokemonList={pokemonList} />;
}
