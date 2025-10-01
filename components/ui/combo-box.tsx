import { useState } from 'react'
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ComboBox({
    options,
    value,
    setValue,
    selectPlaceholder,
    searchPlaceholder,
    emptySearchResultText,
    buttonClassName = "",
    popoverContentClassName = "",
    allowDeselect = true,
}: {
    options: { value: string; label: string }[]
    value: string
    setValue: (value: string) => void
    selectPlaceholder: string
    searchPlaceholder: string
    emptySearchResultText: string
    buttonClassName?: string
    popoverContentClassName?: string
    allowDeselect?: boolean
}) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("justify-between focus-visible:ring-0 focus-visible:ring-offset-0", buttonClassName)}
                >
                    {value
                        ? options.find((entry) => entry.value === value)?.label
                        : selectPlaceholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("p-0", popoverContentClassName)}>
                <Command>
                    <CommandInput className="focus-visible:ring-0 focus-visible:ring-offset-0" placeholder={searchPlaceholder} />
                    <CommandEmpty>{emptySearchResultText}</CommandEmpty>
                    <CommandGroup>
                        {options.map((entry) => (
                            <CommandItem
                                key={entry.value}
                                value={entry.value}
                                onSelect={(currentValue) => {
                                    if (allowDeselect && currentValue === value) {
                                        setValue("")
                                    } else if (currentValue !== value) {
                                        setValue(currentValue)
                                    }
                                    setOpen(false)
                                }}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    if (allowDeselect && entry.value === value) {
                                        setValue("");
                                    } else if (entry.value !== value) {
                                        setValue(entry.value);
                                    }
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === entry.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {entry.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}