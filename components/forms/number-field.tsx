"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface NumberFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  min,
  max,
  step = 1,
  disabled,
}: NumberFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            id={name}
            type="number"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-invalid={!!fieldState.error}
            value={field.value ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              field.onChange(raw === "" ? undefined : Number(raw));
            }}
            onBlur={field.onBlur}
            name={field.name}
            ref={field.ref}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
        </Field>
      )}
    />
  );
}
