import clsx from "clsx";
import { NamedAPIResource, Pokemon } from "pokenode-ts";
import { useCallback, useMemo, useRef } from "react";
import Select, { MenuListProps, OptionProps } from "react-select";
import { FixedSizeList } from "react-window";

const HEIGHT = 32;

export default function PokemonCombobox({
  autoFocus,
  onChange,
  pokemonList,
  selectedPokemon,
}: {
  autoFocus?: boolean;
  onChange(pokemon: NamedAPIResource): void;
  pokemonList: NamedAPIResource[];
  selectedPokemon?: NamedAPIResource;
}) {
  return (
    <Select
      autoFocus={autoFocus}
      defaultMenuIsOpen={autoFocus}
      className="w-full"
      classNames={{
        control: () =>
          clsx(
            "border-2 border-transparent focus-within:border-violet-500 bg-violet-800 text-violet-100 rounded-lg px-4",
            "text-sm"
          ),
        valueContainer: () => "rounded-lg bg-violet-800",
        singleValue: () => "capitalize bg-violet-800 text-violet-100 rounded-lg",
        menuList: () => "rounded-lg text-sm",
        menu: () => "rounded-lg text-sm bg-violet-800 text-violet-100 mt-1 !z-50",
        option: (props) =>
          clsx(
            "!flex items-center bg-violet-800 text-violet-100 w-full h-full px-4",
            "capitalize",
            props.isFocused && "!bg-violet-700"
          ),
      }}
      placeholder="Choose Your Pokemon"
      components={{ MenuList }}
      options={pokemonList as OptionProps<NamedAPIResource, false, never>}
      getOptionLabel={(option) => option.name}
      getOptionValue={(option) => option.name}
      onChange={onChange}
      value={selectedPokemon ? { name: selectedPokemon?.name } : undefined}
      scrollToFocusedOptionOnUpdate
      unstyled
    />
  );
}

function MenuList({ children, options, maxHeight, getValue, getStyles }: MenuListProps<OptionProps>) {
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
