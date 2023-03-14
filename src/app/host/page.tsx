import pokeApi from "~/utils/pokemon-client";
import HostPage from "./host-page";

async function getPokemonList() {
  const res = await pokeApi.pokemon.listPokemons(undefined, 9999);
  return res.results;
}

async function getItemList() {
  const res = await pokeApi.items.listItems(undefined, 9999);
  return Promise.all(
    res.results
      .filter(
        (item) =>
          item.name.includes("herba") || item.name.includes("bottle-cap")
      )
      .map((item) => pokeApi.items.getItemByName(item.name))
  );
}

export default async function Page() {
  const pokemonList = await getPokemonList();
  const itemList = await getItemList();
  return <HostPage itemList={itemList} pokemonList={pokemonList} />;
}
