import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrayFieldTemplateItemType,
  ArrayFieldTemplateProps,
  BaseInputTemplateProps,
  DescriptionFieldProps,
  ErrorListProps,
  FieldErrorProps,
  FieldTemplateProps,
  FormContextType,
  ObjectFieldTemplateProps,
  RJSFSchema,
  RJSFValidationError,
  StrictRJSFSchema,
  SubmitButtonProps,
  TranslatableString,
  ariaDescribedByIds,
  descriptionId,
  errorId,
  examplesId,
  getInputProps,
  getSubmitButtonOptions,
  getTemplate,
  getUiOptions,
  titleId,
} from "@rjsf/utils";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ChangeEvent, FocusEvent, useCallback } from "react";
import { Input } from "@/components/ui/input";

const REQUIRED_ELEM = (
  <span className="text-red-500" role="presentation" aria-hidden="true">
    *
  </span>
);

function CustomFieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    classNames,
    displayLabel,
    style,
    label,
    help,
    required,
    description,
    errors,
    rawErrors,
    children,
  } = props;
  return (
    <div className={cn("space-y-2 w-full grid", classNames)} style={style}>
      {displayLabel && (
        <Label
          htmlFor={id}
          className={cn(rawErrors?.length && "text-destructive", "space-x-0.5")}
        >
          <span>{label}</span>
          {required ? REQUIRED_ELEM : null}
        </Label>
      )}
      {displayLabel && description}
      {children}
      {errors}
      {help}
    </div>
  );
}

function CustomDescriptionFieldTemplate(props: DescriptionFieldProps) {
  const { description, id } = props;
  return (
    <p id={id} className={cn("text-sm text-muted-foreground")}>
      {description}
    </p>
  );
}

function CustomArrayFieldTemplate({
  title,
  required,
  className,
  idSchema,
  items,
  schema,
  uiSchema,
  registry,
  canAdd,
  disabled,
  readonly,
  onAddClick,
}: ArrayFieldTemplateProps) {
  const uiOptions = getUiOptions(uiSchema);
  const ArrayFieldDescriptionTemplate = getTemplate(
    "ArrayFieldDescriptionTemplate",
    registry,
    uiOptions
  );
  const ArrayFieldItemTemplate = getTemplate(
    "ArrayFieldItemTemplate",
    registry,
    uiOptions
  );
  return (
    <fieldset className={cn("space-y-2 grid", className)} id={idSchema.$id}>
      <Label
        id={titleId(idSchema)}
        htmlFor={idSchema.$id}
        className={cn("space-x-0.5")}
      >
        <span>{title}</span>
        {required ? REQUIRED_ELEM : null}
      </Label>
      <ArrayFieldDescriptionTemplate
        idSchema={idSchema}
        description={uiOptions.description || schema.description}
        schema={schema}
        uiSchema={uiSchema}
        registry={registry}
      />
      {items &&
        items.map(({ key, ...itemProps }) => (
          <ArrayFieldItemTemplate
            key={key}
            {...itemProps}
            className={cn(
              !["string"].includes(String(itemProps.schema.type)) && "ml-3"
            )}
          />
        ))}
      {canAdd && (
        <Button
          className="justify-self-end"
          onClick={onAddClick}
          disabled={disabled || readonly}
        >
          <PlusIcon size={14} /> Add Item
        </Button>
      )}
    </fieldset>
  );
}

function CustomArrayFieldItemTemplate(props: ArrayFieldTemplateItemType) {
  const {
    children,
    className,
    disabled,
    hasToolbar,
    hasMoveDown,
    hasMoveUp,
    hasRemove,
    hasCopy,
    index,
    onCopyIndexClick,
    onDropIndexClick,
    onReorderClick,
    readonly,
    registry,
    uiSchema,
  } = props;
  return (
    <div className={cn("flex space-x-2", className)}>
      {children}
      {hasToolbar && hasRemove && (
        <Button
          onClick={onDropIndexClick(index)}
          tabIndex={-1}
          disabled={disabled || readonly}
        >
          <Trash2Icon size={14} />
        </Button>
      )}
    </div>
  );
}

function CustomObjectFieldTemplate({
  description,
  disabled,
  formData,
  idSchema,
  onAddClick,
  properties,
  readonly,
  registry,
  required,
  schema,
  title,
  uiSchema,
}: ObjectFieldTemplateProps) {
  const options = getUiOptions(uiSchema);
  const TitleFieldTemplate = getTemplate(
    "TitleFieldTemplate",
    registry,
    options
  );
  const DescriptionFieldTemplate = getTemplate(
    "DescriptionFieldTemplate",
    registry,
    options
  );
  return (
    <fieldset id={idSchema.$id} className="space-y-8">
      {(title || description) && (
        <div>
          {title && (
            <TitleFieldTemplate
              id={titleId(idSchema)}
              title={title}
              required={required}
              schema={schema}
              uiSchema={uiSchema}
              registry={registry}
            />
          )}
          {description && (
            <DescriptionFieldTemplate
              id={descriptionId(idSchema)}
              description={description}
              schema={schema}
              uiSchema={uiSchema}
              registry={registry}
            />
          )}
        </div>
      )}
      {properties.map((element) => element.content)}
    </fieldset>
  );
}

function CustomSubmitButton(props: SubmitButtonProps) {
  const { uiSchema } = props;
  const { norender } = getSubmitButtonOptions(uiSchema);
  if (norender) {
    return null;
  }
  return <Button type="submit" className="mt-8">Submit</Button>;
}

function CustomFieldErrorTemplate(props: FieldErrorProps) {
  const { errors = [], idSchema } = props;

  if (errors.length === 0) {
    return null;
  }
  const id = errorId(idSchema);

  return (
    <div>
      <ul id={id} className="text-sm font-medium text-destructive">
        {errors
          .filter((elem) => !!elem)
          .map((error, index: number) => {
            return <li key={index}>{error}</li>;
          })}
      </ul>
    </div>
  );
}

function CustomErrorListTemplate({ errors, registry }: ErrorListProps) {
  const { translateString } = registry;
  return (
    <details className="mt-3">
      <summary>{translateString(TranslatableString.ErrorsLabel)}</summary>
      <ul>
        {errors.map((error: RJSFValidationError, i: number) => {
          return <li key={i}>{error.stack}</li>;
        })}
      </ul>
    </details>
  );
}

function CustomBaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    name, // remove this from ...rest
    value,
    readonly,
    disabled,
    autofocus,
    onBlur,
    onFocus,
    onChange,
    onChangeOverride,
    options,
    schema,
    uiSchema,
    formContext,
    registry,
    rawErrors,
    type,
    hideLabel, // remove this from ...rest
    hideError, // remove this from ...rest
    ...rest
  } = props;

  // Note: since React 15.2.0 we can't forward unknown element attributes, so we
  // exclude the "options" and "schema" ones here.
  if (!id) {
    console.log("No id for", props);
    throw new Error(`no id for props ${JSON.stringify(props)}`);
  }
  const inputProps = {
    ...rest,
    ...getInputProps(schema, type, options),
  };

  let inputValue;
  if (inputProps.type === "number" || inputProps.type === "integer") {
    inputValue = value || value === 0 ? value : "";
  } else {
    inputValue = value == null ? "" : value;
  }

  const _onChange = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) =>
      onChange(value === "" ? options.emptyValue : value),
    [onChange, options]
  );
  const _onBlur = useCallback(
    ({ target: { value } }: FocusEvent<HTMLInputElement>) => onBlur(id, value),
    [onBlur, id]
  );
  const _onFocus = useCallback(
    ({ target: { value } }: FocusEvent<HTMLInputElement>) => onFocus(id, value),
    [onFocus, id]
  );

  return (
    <>
      <Input
        id={id}
        name={id}
        className="form-control"
        readOnly={readonly}
        disabled={disabled}
        autoFocus={autofocus}
        value={inputValue}
        {...inputProps}
        list={schema.examples ? examplesId(id) : undefined}
        onChange={onChangeOverride || _onChange}
        onBlur={_onBlur}
        onFocus={_onFocus}
        aria-describedby={ariaDescribedByIds(id, !!schema.examples)}
      />
      {Array.isArray(schema.examples) && (
        <datalist key={`datalist_${id}`} id={examplesId(id)}>
          {(schema.examples as string[])
            .concat(
              schema.default && !schema.examples.includes(schema.default)
                ? ([schema.default] as string[])
                : []
            )
            .map((example: any) => {
              return <option key={example} value={example} />;
            })}
        </datalist>
      )}
    </>
  );
}

const templates = {
  ArrayFieldTemplate: CustomArrayFieldTemplate,
  ArrayFieldItemTemplate: CustomArrayFieldItemTemplate,
  BaseInputTemplate: CustomBaseInputTemplate,
  DescriptionFieldTemplate: CustomDescriptionFieldTemplate,
  ErrorListTemplate: CustomErrorListTemplate,
  FieldTemplate: CustomFieldTemplate,
  FieldErrorTemplate: CustomFieldErrorTemplate,
  ObjectFieldTemplate: CustomObjectFieldTemplate,
  ButtonTemplates: { SubmitButton: CustomSubmitButton },
};

export default templates;