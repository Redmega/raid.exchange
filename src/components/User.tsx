import Clefairy from "$/clefairy.png";
import clsx from "clsx";
import Image from "next/image";

export default function User({
  avatar,
  avatarSize = 48,
  className,
  onlyAvatar,
  username,
}: {
  avatar: string;
  avatarSize?: number;
  className?: string;
  onlyAvatar?: boolean;
  username: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2", className)} title={username}>
      <Image
        className="rounded-full"
        unoptimized
        height={avatarSize}
        width={avatarSize}
        alt="Your avatar"
        src={avatar ?? Clefairy}
      />
      {!onlyAvatar && <span className="text-zinc-50">{username}</span>}
    </div>
  );
}
