"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  description?: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  disabled?: boolean;
}

export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  type = "text",
  textarea,
  rows = 4,
  disabled,
}: TextFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          {textarea ? (
            <Textarea
              id={name}
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              aria-invalid={!!fieldState.error}
              {...field}
              value={field.value ?? ""}
            />
          ) : (
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={!!fieldState.error}
              {...field}
              value={field.value ?? ""}
            />
          )}
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
        </Field>
      )}
    />
  );
}
