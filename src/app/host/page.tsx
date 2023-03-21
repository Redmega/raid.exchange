import dynamic from "next/dynamic";

const HostPage = dynamic(() => import("./host-page"), { ssr: false });

export const metadata = {
  title: "Host | Raid.Exchange",
  description: "Start a new lobby and send your unique invite url so people can join!",
};

export default function Page() {
  return <HostPage />;
}
