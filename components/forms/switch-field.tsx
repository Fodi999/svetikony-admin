"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

interface SwitchFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function SwitchField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
}: SwitchFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>{label}</FieldTitle>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </FieldContent>
          <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} aria-label={label} />
        </Field>
      )}
    />
  );
}
