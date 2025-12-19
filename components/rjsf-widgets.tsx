import {
  ChangeEvent,
  FocusEvent,
  FormEventHandler,
  SyntheticEvent,
  useCallback,
  useMemo,
  createElement,
} from "react";
import {
  ariaDescribedByIds,
  descriptionId,
  getTemplate,
  labelValue,
  schemaRequiresTrueValue,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
  WidgetProps,
} from "@rjsf/utils";
import MultiSelect from "./ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";

function getValue(event: SyntheticEvent<HTMLSelectElement>, multiple: boolean) {
  if (multiple) {
    return Array.from((event.target as HTMLSelectElement).options)
      .slice()
      .filter((o) => o.selected)
      .map((o) => o.value);
  }
  return (event.target as HTMLSelectElement).value;
}

function CustomSelectWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>(props: WidgetProps<T, S, F>) {
  const {
    schema,
    id,
    options,
    value,
    required,
    disabled,
    readonly,
    multiple = false,
    autofocus = false,
    onChange,
    onBlur,
    onFocus,
    placeholder,
  } = props;
  const { enumOptions, enumDisabled, emptyValue } = options;
  const enumValToLabel = enumOptions?.reduce(
    (prev, opt, i) => prev.set(opt.value, opt.label),
    new Map<string, string>()
  );

  if (multiple) {
    const disabledOptions = new Set(enumDisabled || []);
    const multiselectOptions = enumOptions?.map(({ value, label }, _i) => ({
      value,
      label,
      disable: disabledOptions.has(value),
    }));

    return (
      <MultiSelect
        options={multiselectOptions}
        placeholder={placeholder}
        emptyIndicator={"No options"}
        value={(value as string[]).map((v) => ({
          value: v,
          label: enumValToLabel?.get(v) || v,
          disable: disabledOptions.has(v) || undefined,
          fixed: disabled || readonly ? true : undefined,
        }))}
        disabled={disabled || readonly ? true : undefined}
        onChange={(opt) => onChange(opt.map((o) => o.value))}
        inputProps={{
          onBlur: ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
            onBlur(id, value),
          onFocus: ({ target: { value } }: FocusEvent<HTMLInputElement>) =>
            onFocus(id, value),
        }}
      />
    );
  } else {
    return (
      <Select
        onValueChange={onChange}
        value={value}
        defaultValue={emptyValue}
        disabled={disabled || readonly}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {enumOptions?.map(({ value, label }, _i) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
}

function CustomCheckboxWidget<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any
>({
  schema,
  uiSchema,
  options,
  id,
  value,
  disabled,
  readonly,
  label,
  hideLabel,
  autofocus = false,
  onBlur,
  onFocus,
  onChange,
  registry,
}: WidgetProps<T, S, F>) {
  // Because an unchecked checkbox will cause html5 validation to fail, only add
  // the "required" attribute if the field value must be "true", due to the
  // "const" or "enum" keywords
  const required = schemaRequiresTrueValue<S>(schema);

  const handleChange = useCallback(
    (checked: CheckedState) => onChange(checked),
    [onChange]
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => onBlur(id, event.target.checked),
    [onBlur, id]
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => onFocus(id, event.target.checked),
    [onFocus, id]
  );
  const description = options.description ?? schema.description;

  return (
    <div
      className={`checkbox ${
        disabled || readonly ? "disabled" : ""
      } grid gap-1.5`}
    >
      <div className="items-center flex space-x-2 leading-none">
        <Checkbox
          id={id}
          name={id}
          checked={typeof value === "undefined" ? false : value}
          onCheckedChange={handleChange}
          disabled={disabled || readonly}
          autoFocus={autofocus}
          required={required}
          onBlur={handleBlur as any}
          onFocus={handleFocus as any}
          aria-describedby={ariaDescribedByIds<T>(id)}
        />
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {labelValue(<span>{label}</span>, hideLabel)}
        </label>
      </div>
      {!hideLabel &&
        !!description &&
        createElement(
          getTemplate<"DescriptionFieldTemplate", T, S, F>(
            "DescriptionFieldTemplate",
            registry,
            options
          ),
          {
            id: descriptionId<T>(id),
            description,
            schema,
            uiSchema,
            registry,
          }
        )}
    </div>
  );
}

const widgets = {
  SelectWidget: CustomSelectWidget,
  CheckboxWidget: CustomCheckboxWidget,
};

export default widgets;