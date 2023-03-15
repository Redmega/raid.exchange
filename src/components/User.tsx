import { useUser } from "@supabase/auth-helpers-react";
import clsx from "clsx";
import Image from "next/image";

export default function User({
  avatar,
  avatarSize = 48,
  className,
  username,
}: {
  avatar: string;
  username: string;
  avatarSize?: number;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Image
        className="rounded-full"
        unoptimized
        height={avatarSize}
        width={avatarSize}
        alt="Your avatar"
        src={avatar}
      />
      <span className="text-zinc-50">{username}</span>
    </div>
  );
}
