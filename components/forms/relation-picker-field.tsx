"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RelationOption {
  value: string;
  label: string;
}

interface RelationPickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  options: RelationOption[];
  description?: string;
  emptyText?: string;
  disabled?: boolean;
}

export function RelationPickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  description,
  emptyText = "Нічого не знайдено",
  disabled,
}: RelationPickerFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected: string[] = field.value ?? [];
        const selectedOptions = options.filter((o) => selected.includes(o.value));

        function toggle(value: string) {
          if (selected.includes(value)) {
            field.onChange(selected.filter((v) => v !== value));
          } else {
            field.onChange([...selected, value]);
          }
        }

        return (
          <Field>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                id={name}
                disabled={disabled}
                render={<Button type="button" variant="outline" className="h-auto min-h-11 w-full justify-between font-normal" />}
              >
                <span className="flex flex-wrap gap-1">
                  {selectedOptions.length === 0 ? (
                    <span className="text-muted-foreground">Не обрано</span>
                  ) : (
                    selectedOptions.map((option) => (
                      <Badge key={option.value} variant="secondary" className="gap-1">
                        {option.label}
                        <span
                          role="button"
                          tabIndex={-1}
                          className="rounded-sm opacity-70 hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggle(option.value);
                          }}
                        >
                          <X className="size-3" />
                        </span>
                      </Badge>
                    ))
                  )}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder="Пошук…" />
                  <CommandList>
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => (
                        <CommandItem key={option.value} value={option.label} onSelect={() => toggle(option.value)}>
                          <Check
                            className={cn("size-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </Field>
        );
      }}
    />
  );
}
