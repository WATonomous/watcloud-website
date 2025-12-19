import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input, InputProps } from "@/components/ui/input";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ajvResolver } from "@/lib/ajv-standalone-resolver";
import type {
  FieldArray,
  FieldArrayPath,
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ValidateFunction } from "ajv";
import type { BaseSyntheticEvent } from "react";

const REQUIRED_ELEM = (
  <span className="text-red-500" role="presentation" aria-hidden="true">
    *
  </span>
);

/**
 * Finds the paths of primitive arrays in a JSON schema.
 *
 * @param path - The current path in the schema.
 * @param schema - The JSON schema to search.
 * @returns An array of string paths representing the primitive arrays found in the schema.
 * @throws {Error} If the schema contains unsupported array item types or missing properties.
 */
function findPrimitiveArrayPaths(
  path: string,
  schema: JSONSchema7Definition
): string[] {
  if (typeof schema === "boolean") {
    return [];
  }

  if (schema.type === "array") {
    const items = schema.items;
    if (!items || typeof items === "boolean") {
      return [];
    }
    if (Array.isArray(items)) {
      throw new Error(`items arrays are not supported`);
    }
    if (!items.type) {
      return [];
    }
    if (Array.isArray(items.type)) {
      throw new Error(`items.type arrays are not supported`);
    }
    if (["string", "number", "integer", "boolean"].includes(items.type)) {
      return [path];
    } else {
      throw new Error(`Unsupported array item type: ${items.type}`);
    }
  } else if (schema.type === "object") {
    const properties = schema.properties;
    if (!properties) {
      throw new Error(`Object schema must have properties`);
    }
    return Object.entries(properties).flatMap(([key, value]) =>
      findPrimitiveArrayPaths(`${path}.${key}`, value)
    );
  }

  return [];
}

function getDefaultValues(schema: JSONSchema7Definition): any {
  if (typeof schema === "boolean") {
    throw new Error(`Boolean schema not supported`);
  } else if (schema.type === "object") {
    const properties = schema.properties;
    if (!properties) {
      throw new Error(`Object schema must have properties`);
    }
    return Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        getDefaultValues(value),
      ])
    );
  } else if (schema.type === "array") {
    return [];
  } else if (schema.type === "string") {
    return "";
  } else {
    throw new Error(`Unsupported schema type: ${schema.type}`);
  }
}

function StringArrayField<TFieldValues extends FieldValues>({
  path,
  schema,
  items,
  form,
  required,
}: {
  path: FieldPath<TFieldValues>;
  schema: JSONSchema7;
  items: JSONSchema7;
  form: UseFormReturn<TFieldValues>;
  required: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: path as FieldArrayPath<TFieldValues>,
  });

  return (
    <FormField
      control={form.control}
      name={path}
      render={(renderProps) => {
        return (
          <FormItem className="grid">
            <FormLabel className="space-x-0.5">
              <span>{schema.title}</span>
              {required || (schema.minItems && schema.minItems > 0)
                ? REQUIRED_ELEM
                : null}
            </FormLabel>
            <FormDescription>{schema.description}</FormDescription>
            {fields.map((field, index) => (
              <div key={field.id} className="flex space-x-2">
                {JSONSchemaFormRecursive(
                  `${path}.${index}.value` as FieldPath<TFieldValues>,
                  items,
                  form
                )}
                <Button
                  onClick={() => remove(index)}
                  tabIndex={-1}
                  className="mt-2"
                >
                  <Trash2Icon size={14} />
                </Button>
              </div>
            ))}
            <Button
              className="justify-self-end"
              onClick={(e) => {
                e.preventDefault();
                append({ value: "" } as FieldArray<
                  TFieldValues,
                  FieldArrayPath<TFieldValues>
                >);
              }}
            >
              <PlusIcon size={14} /> Add Item
            </Button>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function JSONSchemaFormRecursive<TFieldValues extends FieldValues>(
  path: FieldPath<TFieldValues> | "",
  schema: JSONSchema7Definition,
  form: UseFormReturn<TFieldValues>,
  {
    required = false,
  }: {
    required?: boolean;
  } = {}
) {
  if (typeof schema === "boolean") {
    throw new Error(`Boolean schema not supported`);
  } else if (schema.type === "object") {
    const properties = schema.properties;
    if (!properties) {
      throw new Error(`Object schema must have properties`);
    }
    return (
      <>
        {Object.entries(properties).map(([key, value]) => {
          return (
            <div key={key}>
              {JSONSchemaFormRecursive(
                `${path}.${key}` as FieldPath<TFieldValues>,
                value,
                form,
                {
                  required: (schema.required || []).includes(key),
                }
              )}
            </div>
          );
        })}
      </>
    );
  } else if (schema.type === "array") {
    const items = schema.items;
    if (!items) {
      throw new Error(`Array schema must have items`);
    }
    if (typeof items === "boolean") {
      throw new Error(`Boolean schema not supported for array items`);
    }
    if (Array.isArray(items)) {
      throw new Error(`Array of array not supported`);
    }
    if (items.type === "string") {
      if (path === "") {
        throw new Error(`Can't have a string array schema at the root`);
      }

      return (
        <StringArrayField
          path={path}
          schema={schema}
          items={items}
          form={form}
          required={required}
        />
      );
    } else {
      throw new Error(`Unsupported array item type: ${items.type}`);
    }
  } else if (schema.type === "string") {
    if (path === "") {
      throw new Error(`Can't have a string schema at the root`);
    }

    const inputProps: InputProps = {};

    if (schema.format === "email") {
      inputProps["type"] = "email";
    }

    return (
      <FormField
        control={form.control}
        name={path}
        render={(renderProps) => {
          const { field } = renderProps;
          return (
            <FormItem className="w-full">
              <FormLabel className="space-x-0.5">
                <span>{schema.title}</span>
                {required ? REQUIRED_ELEM : null}
              </FormLabel>
              <FormDescription>{schema.description}</FormDescription>
              <FormControl>
                <Input {...field} {...inputProps} />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  } else {
    throw new Error(`Unsupported schema type: ${schema.type}`);
  }
}

export default function JSONSchemaForm({
  schema,
  validate,
  onSubmit,
}: {
  schema: JSONSchema7;
  validate: ValidateFunction;
  onSubmit: (data: any, form: UseFormReturn) => void | Promise<void>;
}) {
  const primitiveArrayPaths = findPrimitiveArrayPaths("", schema);

  const form = useForm({
    defaultValues: getDefaultValues(schema),
    resolver: ajvResolver(validate, { primitiveArrayPaths }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data, _event) => onSubmit(data, form))} className="space-y-8 my-8">
        {JSONSchemaFormRecursive("", schema, form)}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
