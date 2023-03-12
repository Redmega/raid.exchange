import SupabaseProvider from "~/components/SupabaseProvider";
import "./globals.css";

export const metadata = {
  title: "Raid.Exchange",
  description:
    "Team up with players around the world and complete Pokemon Scarlet & Violet Raids!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="p-2 text-zinc-50 bg-zinc-900 bg-gradient-to-br from-zinc-900 to-violet-900/50">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
