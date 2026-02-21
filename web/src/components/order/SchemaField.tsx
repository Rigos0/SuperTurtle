import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A single property from a JSON Schema "properties" block. */
export interface FieldSchema {
  type?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

interface SchemaFieldProps {
  name: string;
  schema: FieldSchema;
  required: boolean;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

export function SchemaField({
  name,
  schema,
  required,
  value,
  onChange,
}: SchemaFieldProps) {
  const label = formatLabel(name);
  const id = `field-${name}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>

      {schema.type === "boolean" ? (
        <BooleanField
          id={id}
          checked={value === true}
          onChange={(v) => onChange(name, v)}
        />
      ) : schema.enum ? (
        <EnumField
          id={id}
          options={schema.enum}
          value={String(value ?? "")}
          required={required}
          onChange={(v) => onChange(name, v)}
        />
      ) : schema.type === "integer" || schema.type === "number" ? (
        <NumberField
          id={id}
          value={value}
          required={required}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === "integer" ? 1 : undefined}
          onChange={(v) => onChange(name, v)}
        />
      ) : (
        <StringField
          id={id}
          value={String(value ?? "")}
          required={required}
          onChange={(v) => onChange(name, v)}
        />
      )}

      <HintText schema={schema} />
    </div>
  );
}

function StringField({
  id,
  value,
  required,
  onChange,
}: {
  id: string;
  value: string;
  required: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      id={id}
      type="text"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberField({
  id,
  value,
  required,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  value: unknown;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <Input
      id={id}
      type="number"
      value={value === null || value === undefined ? "" : String(value)}
      required={required}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange(null);
          return;
        }
        const num = step === 1 ? parseInt(raw, 10) : parseFloat(raw);
        if (!Number.isNaN(num)) {
          onChange(num);
        }
      }}
    />
  );
}

function BooleanField({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        className="h-4 w-4 rounded border border-input accent-primary"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-muted-foreground">
        {checked ? "Enabled" : "Disabled"}
      </span>
    </label>
  );
}

function EnumField({
  id,
  options,
  value,
  required,
  onChange,
}: {
  id: string;
  options: string[];
  value: string;
  required: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      required={required}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function HintText({ schema }: { schema: FieldSchema }) {
  const parts: string[] = [];

  if (schema.type === "integer") parts.push("integer");
  else if (schema.type === "number") parts.push("number");

  if (schema.minimum !== undefined) parts.push(`min ${schema.minimum}`);
  if (schema.maximum !== undefined) parts.push(`max ${schema.maximum}`);
  if (schema.default !== undefined) parts.push(`default: ${String(schema.default)}`);

  if (parts.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
  );
}

/** Convert snake_case / camelCase field name into a readable label. */
function formatLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
