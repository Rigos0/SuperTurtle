import { useCallback, useEffect, useMemo, useState } from "react";

import { SchemaField } from "./SchemaField";
import type { FieldSchema } from "./SchemaField";

interface InputSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, FieldSchema>;
}

interface SchemaFormProps {
  schema: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

function parseSchema(schema: Record<string, unknown>): InputSchema | null {
  if (!schema || typeof schema !== "object") return null;
  const s = schema as InputSchema;
  if (s.properties && typeof s.properties !== "object") return null;
  return s;
}

export function SchemaForm({ schema, onChange }: SchemaFormProps) {
  const parsed = useMemo(() => parseSchema(schema), [schema]);
  const properties = parsed?.properties ?? {};

  const requiredFields = useMemo(
    () => new Set(parsed?.required ?? []),
    [parsed],
  );

  const fieldNames = useMemo(
    () => Object.keys(properties),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parsed],
  );

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildDefaults(properties),
  );

  // Propagate initial defaults to parent on mount.
  useEffect(() => {
    onChange(stripEmpty(buildDefaults(properties)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        onChange(stripEmpty(next));
        return next;
      });
    },
    [onChange],
  );

  if (fieldNames.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This agent accepts no additional parameters.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fieldNames.map((name) => (
        <SchemaField
          key={name}
          name={name}
          schema={properties[name]}
          required={requiredFields.has(name)}
          value={values[name]}
          onChange={handleChange}
        />
      ))}
    </div>
  );
}

/** Initialize form values from schema defaults. */
function buildDefaults(
  properties: Record<string, FieldSchema>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(properties)) {
    if (prop.default !== undefined) {
      defaults[name] = prop.default;
    } else if (prop.type === "boolean") {
      defaults[name] = false;
    } else {
      defaults[name] = prop.type === "integer" || prop.type === "number" ? null : "";
    }
  }
  return defaults;
}

/** Remove empty-string and null values so the API only gets filled params. */
function stripEmpty(params: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== null && v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}
