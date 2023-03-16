import AuthHeader from "~/components/AuthHeader";
import PokemonProvider from "~/components/PokemonProvider";
import SupabaseProvider from "~/components/SupabaseProvider";
import { buildPokemonContext } from "~/utils/pokemon-client";
import "./globals.css";

export const metadata = {
  title: "Raid.Exchange",
  description: "Team up with players around the world and complete Pokemon Scarlet & Violet Raids!",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pokemonContext = await buildPokemonContext();
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="p-2 text-zinc-50 bg-violet-900 bg-gradient-to-br from-zinc-900/75 to-violet-900">
        <SupabaseProvider>
          <PokemonProvider value={pokemonContext}>
            <AuthHeader />
            <main className="relative h-full w-full flex flex-col items-center justify-center z-0">{children}</main>
          </PokemonProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
