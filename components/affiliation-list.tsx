import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { AffiliationInfo } from "@/lib/data";

export function AffiliationList({
  affiliationInfo,
}: {
  affiliationInfo: AffiliationInfo;
}) {
  return (
    <div className="my-6 border rounded">
      <Command>
        <CommandInput placeholder="Find your affiliation..." />
        <CommandList className="h-80">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Affiliations">
            {affiliationInfo.affiliations
              .filter((a) => !a.is_legacy)
              .map((a) => (
                <CommandItem
                  key={a.name}
                  className="aria-[selected=true]:bg-inherit aria-[selected=true]:text-accent-inherit"
                >
                  {a.name}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Legacy affiliations">
            {affiliationInfo.affiliations
              .filter((a) => a.is_legacy)
              .map((a) => (
                <CommandItem
                  className="aria-[selected=true]:bg-inherit aria-[selected=true]:text-accent-inherit"
                  key={a.name}
                >
                  {a.name}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
