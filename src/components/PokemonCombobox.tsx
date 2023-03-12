import clsx from "clsx";
import { NamedAPIResource } from "pokenode-ts";
import { useCallback, useMemo, useRef } from "react";
import Select, { MenuListProps, OptionProps } from "react-select";
import { FixedSizeList } from "react-window";

const HEIGHT = 32;

export default function PokemonCombobox({
  onChange,
  pokemonList,
}: {
  onChange(pokemon: NamedAPIResource): void;
  pokemonList: NamedAPIResource[];
}) {
  return (
    <Select
      className="w-full"
      classNames={{
        control: () =>
          clsx(
            "border-2 border-transparent focus-within:border-purple-500 bg-purple-800 text-purple-100 rounded-lg px-4",
            "text-sm"
          ),
        valueContainer: () => "rounded-lg bg-purple-800",
        singleValue: () =>
          "capitalize bg-purple-800 text-purple-100 rounded-lg",
        menuList: () => "rounded-lg",
        menu: () => "rounded-lg bg-purple-800 text-purple-100 mt-1",
        option: (props) =>
          clsx(
            "flex items-center bg-purple-800 text-purple-100 w-full h-full px-4",
            "capitalize",
            props.isFocused && "!bg-purple-700"
          ),
      }}
      placeholder="Choose Your Pokemon"
      components={{ MenuList }}
      options={pokemonList as OptionProps<NamedAPIResource, false, never>}
      getOptionLabel={(option) => option.name}
      getOptionValue={(option) => option.name}
      onChange={onChange}
      scrollToFocusedOptionOnUpdate
      unstyled
    />
  );
}

function MenuList({
  children,
  options,
  maxHeight,
  getValue,
  getClassNames,
  innerProps,
}: MenuListProps<OptionProps>) {
  const [value] = getValue();
  const initialOffset = options.indexOf(value) * HEIGHT;

  return (
    <FixedSizeList
      className="rounded-lg"
      width="100%"
      height={maxHeight}
      itemCount={children.length}
      itemSize={HEIGHT}
      initialScrollOffset={initialOffset}
    >
      {({ index, style }) => <div style={style}>{children[index]}</div>}
    </FixedSizeList>
  );
}
