import { useUser } from "@supabase/auth-helpers-react";
import clsx from "clsx";
import Image from "next/image";

export default function User({
  avatarSize = 48,
  className,
}: {
  avatarSize?: number;
  className?: string;
}) {
  const user = useUser()!;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <Image
        className="rounded-full"
        unoptimized
        height={avatarSize}
        width={avatarSize}
        alt="Your avatar"
        src={user.user_metadata.avatar_url}
      />
      <span className="text-zinc-50">{user.user_metadata.full_name}</span>
    </div>
  );
}
