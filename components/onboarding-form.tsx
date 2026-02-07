import React from "react";
import userSchemaJSON from "@/build/fixtures/user.schema.generated.json";
import userSchemaValidate from "@/build/fixtures/user.schema.validate";
import RJSFFields from "@/components/rjsf-fields";
import RJSFTemplates from "@/components/rjsf-templates";
import RJSFWidgets from "./rjsf-widgets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Form, { IChangeEvent } from "@rjsf/core";
import {
  createPrecompiledValidator,
} from "@rjsf/validator-ajv8";
import { JSONSchema7 } from "json-schema";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { lookupStringMDX, userSchemaStrings } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "./ui/checkbox";
import { ariaDescribedByIds, toPathSchema } from "@rjsf/utils";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Code, Pre } from "nextra/components";
import { Textarea } from "@/components/ui/textarea";
import { debounce, deepSet, encryptUnixPassword, getDayjsRelative, encryptBcryptPassword, getObjectPaths, getValuesFromPath, isCryptFormat, isBcryptFormat } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { encodeURI as b64EncodeURI, decode as b64Decode } from "js-base64";

export const INITIAL_FORM_DATA_QUERY_PARAM = "initialformdatab64";
export const EXPIRES_AT_QUERY_PARAM = "expires-at";
const FORM_STATE_KEY = "onboarding-form-state";

const dayjs = getDayjsRelative();

function saveFormState(obj: Record<string, any>) {
  window.sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(obj));
}

const saveFormStateDebounced = debounce(saveFormState, 500);

function getFormState() {
  if (typeof window === "undefined") {
    return {};
  }

  const state = window.sessionStorage.getItem(FORM_STATE_KEY);
  try {
    return state ? JSON.parse(state) : {};
  } catch (e) {
    console.error("Failed to parse form state", e, state);
    return {};
  }
}

const cryptPaths = getObjectPaths(userSchemaJSON as JSONSchema7, (property: Record<string, any>) => property["$transform"] === "crypt");
const bcryptPaths = getObjectPaths(userSchemaJSON as JSONSchema7, (property: Record<string, any>) => property["$transform"] === "bcrypt");

const validator = createPrecompiledValidator(
  userSchemaValidate,
  userSchemaJSON as JSONSchema7
);

function string_to_mdx(str: string) {
  return lookupStringMDX(userSchemaStrings, str);
}

function postprocessFormData(data: Record<string, unknown>) {
  for (const path of cryptPaths) {
    for (const { value, path: actualPath } of getValuesFromPath(
      data,
      path
    )) {
      // If the password is already encrypted, we don't need to do anything.
      // Else, encrypt it.
      if (value && !isCryptFormat(value)) {
        deepSet(data, actualPath, encryptUnixPassword(value));
      }
    }
  }
  for (const path of bcryptPaths) {
    for (const { value, path: actualPath } of getValuesFromPath(
      data,
      path
    )) {
      // If the password is already encrypted, we don't need to do anything.
      // Else, encrypt it.
      if (value && !isBcryptFormat(value)) {
        const encryptedValue = encryptBcryptPassword(value);
        deepSet(data, actualPath, encryptedValue);
      }
    }
  }
  return data;
}

export default function OnboardingForm() {
  const { query, isReady } = useRouter();
  // parse initial form data from query params
  const expiresAtFromParam = Array.isArray(query[EXPIRES_AT_QUERY_PARAM])
    ? query[EXPIRES_AT_QUERY_PARAM][0]
    : query[EXPIRES_AT_QUERY_PARAM];
  const initialFormDataB64FromParam = Array.isArray(query[INITIAL_FORM_DATA_QUERY_PARAM])
    ? query[INITIAL_FORM_DATA_QUERY_PARAM][0]
    : query[INITIAL_FORM_DATA_QUERY_PARAM];

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [alertBody, setAlertBody] = useState(
    null as string | React.JSX.Element | null
  );
  const [alertError, setAlertError] = useState(null as string | null);
  const [alertSuccess, setAlertSuccess] = useState(null as string | null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [formData, _setFormData] = useState(null as any);

  // Use session storage to persist form data in case of accidental navigation.
  // We don't prevent navigation, because that's an anti-pattern:
  // https://reactrouter.com/en/main/hooks/use-blocker
  useEffect(() => {
    if (!isReady) {
      // The router is not ready yet, so the query params are not available.
      // https://github.com/vercel/next.js/discussions/11484#discussioncomment-356055
      return;
    }

    try {
      const savedFormState = getFormState();
      const savedFormData = savedFormState.formData;
      const savedInitialFormDataB64FromParam =
        savedFormState.initialFormDataB64FromParam;

      const initialFormDataFromParam = initialFormDataB64FromParam
        ? JSON.parse(b64Decode(initialFormDataB64FromParam as string))
        : null;

      // Choose initial form data:
      // 1. If there's no form data from query param, use saved form data.
      // 2. If there is form data from query param, and it's the same as before, use saved form data. This allows
      //    restoring the form data after an (accidental) navigation.
      // 3. If the data from query param is expired, use saved form data.
      // 4. If there is form data from query param, and it's different from before, the saved data is stale.
      //    Use form data from query param.
      let dataSource = "" as "sessionStorage" | "queryParam" | "";
      let initialFormData = null;
      if (!initialFormDataFromParam) {
        initialFormData = savedFormData;
        dataSource = "sessionStorage";
      } else if (initialFormDataB64FromParam === savedInitialFormDataB64FromParam) {
        initialFormData = savedFormData;
        dataSource = "sessionStorage";
      } else if (expiresAtFromParam && Date.parse(expiresAtFromParam) < Date.now()) {
        toast.warning(`The form data from the query params is too old (expired ${dayjs().to(expiresAtFromParam)}). Not using it. If you are editing an existing profile, you can request a new link using the profile editor.`, { duration: 10000 });
        initialFormData = savedFormData;
        dataSource = "sessionStorage";
      } else {
        initialFormData = initialFormDataFromParam;
        dataSource = "queryParam";
      }

      if (initialFormData) {
        _setFormData(initialFormData);
        if (dataSource === "sessionStorage") {
          toast.success("Successfully restored form data from session storage.");
        } else if (dataSource === "queryParam") {
          toast.success("Successfully loaded form data from query params.");
        }
      }
    } catch (e) {
      console.error("Failed to load saved form data", e);

      toast.error("Failed to load saved form data. Please see the browser console for more information.");
    }
  }, [isReady, initialFormDataB64FromParam, expiresAtFromParam]);

  function setFormData(data: any) {
    _setFormData(data);
    saveFormStateDebounced({ formData: data, initialFormDataB64FromParam });
  }

  function handleShowAdvancedFieldsChange(checked: CheckedState) {
    setShowAdvancedFields(checked === true);
  }

  function handleFormDataChange(event: IChangeEvent, id?: string) {
    if (id) {
      // Only update the data if a field changed
      setFormData(event.formData);
    }
  }

  function resetAlert() {
    setIsAlertOpen(false);
    setAlertTitle("");
    setAlertDescription("");
    setAlertBody(null);
    setAlertError(null);
    setAlertSuccess(null);
  }

  function handleShowRawData() {
    resetAlert();
    setAlertTitle("Raw data");
    setAlertDescription("Below is the raw data from the form. You can send this to the WATcloud team for debugging purposes.");
    setAlertBody(
      <>
        <Pre>
          <Code>
            {JSON.stringify(postprocessFormData(formData), null, 2)}
          </Code>
        </Pre>
      </>
    )
    setIsAlertOpen(true);
  }

  function handleGenerateEditLink() {
    resetAlert();
    setAlertTitle("Edit link");
    setAlertDescription("Below is a link to the form with the current data pre-filled. You can send this to others as a template.");
    const editLink = `${window.location.origin}${window.location.pathname}?${INITIAL_FORM_DATA_QUERY_PARAM}=${b64EncodeURI(JSON.stringify(postprocessFormData(formData)))}`;
    setAlertBody(
      <>
        <Pre>
          <Code>
            {editLink}
          </Code>
        </Pre>
      </>
    )
    setIsAlertOpen(true);
  }

  function handleLoadData() {
    resetAlert();
    setAlertTitle("Load data");
    setAlertDescription("Paste raw data (JSON) below to load it into the form.");
    setAlertBody(
      <>
        <div className="my-4">
          <Textarea
            onChange={(event) => {
              setAlertError(null)
              setAlertSuccess(null)
              try {
                setFormData(JSON.parse(event.target.value));
                setAlertSuccess("Data loaded successfully!");
              } catch (e) {
                console.error(e);
                setAlertError(`Failed to parse JSON: ${e}`);
              }
            }}
          />
        </div>
      </>
    )
    setIsAlertOpen(true);
  }

  function handleAlertEsc(event: React.KeyboardEvent) {
    if (isSubmitting) {
      console.warn("Submitting, cannot close alert");
      event.preventDefault();
      return;
    }
  }

  async function onSubmit({ formData: _data }: IChangeEvent) {
    resetAlert();
    setAlertTitle("Submitting");
    setAlertDescription("Please wait while we submit your request...");
    setIsSubmitting(true);
    setIsAlertOpen(true);

    const data = postprocessFormData(_data);

    const { watcloud_username } = data.general as Record<string, any>;
    const slug = watcloud_username

    if (!slug) {
      console.error()
    }

    try {
      const res = await fetch("https://repo-ingestion.watonomous.ca/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: "watonomous/infra-config",
          branch_suffix: `user-${slug}`,
          files: [
            {
              path: `directory/users/data/${slug}.yml`,
              content: JSON.stringify(data),
              transforms: [{ type: "json2yaml" }],
            },
          ],
        }),
      });

      if (res.status === 200) {
        const resJson = await res.json();
        const requestID = resJson.pr_url;

        setAlertTitle("Success!");
        setAlertDescription("");
        setAlertBody(
          <div className="my-4">
            <p>
              Successfully submitted registration request for <Code>{slug}</Code>! We will review your request and get back to you shortly.
              Your request ID is:
            </p>
            <Pre>
              <Code>
                {requestID}
              </Code>
            </Pre>
            <p>Please send this to your WATcloud contact for approval and deployment.</p>
          </div>
        )
        setFormData({});
      } else {
        const errmsg = `Something went wrong! Error code: ${res.status}. Error message: "${await res.text()}".`;
        console.error(errmsg);

        setAlertTitle("Error");
        setAlertDescription("");
        setAlertError(errmsg);
      }
    } catch (e) {
      const errmsg = `Something went wrong! Network request failed with error "${e}".`;
      console.error(errmsg);

      setAlertTitle("Error");
      setAlertDescription("");
      setAlertError(errmsg);
    }
    setIsSubmitting(false);
  }

  return (
    <div className="my-8">
      <Form
        schema={userSchemaJSON as JSONSchema7}
        validator={validator}
        noHtml5Validate
        formData={formData}
        onChange={handleFormDataChange}
        onSubmit={onSubmit}
        showErrorList={"bottom"}
        focusOnFirstError={true}
        templates={RJSFTemplates}
        fields={RJSFFields}
        widgets={RJSFWidgets}
        formContext={{
          string_to_mdx,
          showRootTitle: false,
          showRootDescription: false,
          showAdvancedFields,
        }}
      >
        <div className="mt-8 space-x-4">
          <Button type="submit">Submit</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Advanced</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Form</DropdownMenuLabel>
              <DropdownMenuItem>
                <div className="items-center flex space-x-2 leading-none">
                  <Checkbox
                    id="checkbox-show-advanced-fields"
                    name="checkbox-show-advanced-fields"
                    checked={showAdvancedFields === true}
                    onCheckedChange={handleShowAdvancedFieldsChange}
                    aria-describedby={ariaDescribedByIds(
                      "checkbox-show-advanced-fields"
                    )}
                  />
                  <label
                    htmlFor="checkbox-show-advanced-fields"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <span>Show advanced fields</span>
                  </label>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Data</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleShowRawData}>
                Show raw data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateEditLink}>
                Generate edit link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLoadData}>
                Load data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Form>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent
          className="max-h-[80vh] overflow-y-auto block"
          onEscapeKeyDown={handleAlertEsc as any}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {alertBody}
          {alertError && <div className="text-red-500">{alertError}</div>}
          {alertSuccess && <div className="text-green-500">{alertSuccess}</div>}
          <AlertDialogFooter>
            {isSubmitting ? (
              <AlertDialogAction disabled>
                <Loader2 className="animate-spin" />
              </AlertDialogAction>
            ) : (
              <AlertDialogAction>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  );
}
