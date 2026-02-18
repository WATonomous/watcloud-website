import affiliationSchemaJSON from "@/build/fixtures/affiliation.schema.json";
import affiliationSchemaValidate from "@/build/fixtures/affiliation.schema.validate";
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
import { slugify } from "@/lib/utils";
import { CopyableCode } from "@/components/ui/copy-button";
import Form from "@rjsf/core"; // Or whatever theme you use
import {
  createPrecompiledValidator,
} from "@rjsf/validator-ajv8";
import { JSONSchema7 } from "json-schema";
import { Loader2 } from "lucide-react";
import React from "react";
import { createRef, useState } from "react";

const validator = createPrecompiledValidator(
  affiliationSchemaValidate,
  affiliationSchemaJSON as JSONSchema7
);

const formRef = createRef<Form>()

export default function AffiliationForm() {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [alertBody, setAlertBody] = useState(null as React.JSX.Element | null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit({ formData: data }: any) {
    setIsAlertOpen(true);
    setAlertTitle("Submitting");
    setAlertDescription("Please wait while we submit your request...");
    setAlertBody(null);
    setIsSubmitting(true);

    const { name } = data;
    const slug = slugify(name);

    try {
      const res = await fetch("https://repo-ingestion.watonomous.ca/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: "watonomous/infra-config",
          branch_suffix: `affiliation-${slug}`,
          files: [
            {
              path: `directory/affiliations/data/${slug}.yml`,
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
              Successfully submitted registration request for &quot;{name}&quot;!
              We will review your request and get back to you shortly.
              Your request ID is:
            </p>
            <CopyableCode>{requestID}</CopyableCode>
            <p>Please send this to your WATcloud contact for approval and deployment.</p>
          </div>
        );
        if (!formRef.current) {
          console.error(`Form ref is not set! formRef: ${formRef}, formRef.current: ${formRef.current}`);
        } else {
          formRef.current.reset();
        }
      } else {
        setAlertTitle("Error");
        setAlertDescription(
          `Something went wrong! Error code: ${
            res.status
          }. Error message: "${await res.text()}".`
        );
      }
    } catch (e) {
      setAlertTitle("Error");
      setAlertDescription(
        `Something went wrong! Network request failed with error "${e}".`
      );
    }
    setIsSubmitting(false);
  }

  return (
    <div className="my-8">
      <Form
        schema={affiliationSchemaJSON as JSONSchema7}
        validator={validator}
        noHtml5Validate
        onSubmit={onSubmit}
        ref={formRef}
        showErrorList={"bottom"}
        focusOnFirstError={true}
        templates={RJSFTemplates}
        fields={RJSFFields}
        widgets={RJSFWidgets}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription>{alertDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {alertBody}
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
    </div>
  );
}
