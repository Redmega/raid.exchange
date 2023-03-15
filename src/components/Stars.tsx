import clsx from "clsx";
import { MouseEvent, useCallback, useState } from "react";

const STARS = [1, 2, 3, 4, 5, 6, 7];

export default function Stars({
  onChange,
  stars,
}: {
  onChange(stars: number): void;
  stars: number;
}) {
  const [value, setValue] = useState(stars);

  const handleChangeStar = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const stars = event.currentTarget.value;
      setValue(parseInt(stars));
      onChange(parseInt(stars));
    },
    [onChange]
  );

  return (
    <fieldset className="flex w-full items-center justify-center mx-auto gap-1">
      {STARS.map((star) => (
        <button
          key={star}
          className={clsx(
            "text-xl transition-colors",
            star <= value ? "text-yellow-300" : "text-violet-50"
          )}
          type="button"
          value={star}
          onChange={(e) => e.preventDefault()}
          onClick={handleChangeStar}
        >
          {star <= value ? "★" : "☆"}
        </button>
      ))}
    </fieldset>
  );
}
