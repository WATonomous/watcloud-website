import Uppy from '@uppy/core';
import type { UppyFile, SuccessResponse } from '@uppy/core'
import { Dashboard } from '@uppy/react';
import AwsS3 from '@uppy/aws-s3';
import { useEffect, useState } from 'react';
import { sha256 } from 'js-sha256';
import { useTheme } from 'nextra-theme-docs';
import { bytesToSize, parseAttributes, maxBy, getDayjsRelative } from '@/lib/utils';
import { Code, Pre } from 'nextra/components';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import { Textarea } from './ui/textarea';
import { Separator } from "@/components/ui/separator";

const dayjs = getDayjsRelative();

const sha256Cache = new Map<string, string>();

const RESOLVER_URL_PREFIXES = [
    "https://rgw.watonomous.ca/asset-temp",
    "https://rgw.watonomous.ca/asset-perm",
    "https://rgw.watonomous.ca/asset-off-perm",
]

const extractSha256FromURI = (uri: string) => {
    const sha256Match = uri.match(/sha256:([a-f0-9]{64})/);
    if (!sha256Match) {
        throw new Error("Invalid URI: does not contain a SHA-256 hash.");
    }
    return sha256Match[1];
}

const assetInspectorFormSchema = z.object({
  uris: z.string(),
});

async function resolveURI(uri: string) {
    if (!uri.startsWith('watcloud://v1/')) {
        throw new Error(`Invalid URI: must start with "watcloud://v1/". Got: "${uri}"`);
    }

    const hash = extractSha256FromURI(uri);

    const results = await Promise.all(RESOLVER_URL_PREFIXES.map(async (prefix) => {
        const r = `${prefix}/${hash}`;
        const res = await fetch(r, { method: 'HEAD' });
        if (res.ok) {
            const headers = new Map(res.headers);
            const xAmzExpiration = headers.get('x-amz-expiration');
            const expiresAt = xAmzExpiration ? parseAttributes(xAmzExpiration)['expiry-date'] : undefined;
            const lastModified = headers.get('last-modified');
            return {
                url: r,
                headers,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                lastModified: lastModified ? new Date(lastModified) : undefined,
            };
        }
    }));

    // find the result with the latest expiry date
    const result = maxBy(results, res => {
        // No result
        if (!res) return 0;

        // No expiry date
        if (!res.expiresAt) return Infinity;

        return res.expiresAt.getTime();
    });
    if (!result) {
        throw new Error(`Asset not found: ${uri}`);
    }

    return {
        uri,
        result,
    };
}

export function AssetInspector() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resolvedResults, setResolvedResults] = useState<(Awaited<ReturnType<typeof resolveURI>> | {
        uri: string,
        error: Error,
    })[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const form = useForm<z.infer<typeof assetInspectorFormSchema>>({
        resolver: zodResolver(assetInspectorFormSchema),
        defaultValues: {
            uris: "",
        },
    });

    async function onSubmit({ uris: urisString }: z.infer<typeof assetInspectorFormSchema>) {
        setResolvedResults([]);
        setErrorMessage("");
        setIsSubmitting(true);

        const uris = urisString.split('\n').map((uri) => uri.trim()).filter((uri) => uri.length > 0);

        try {
            const results = await Promise.all(uris.map(uri => 
                resolveURI(uri).catch((error: Error) => ({ uri: uri, error: error }))
            ));

            setResolvedResults(results);
        } catch (error: any) {
            console.error('Error while resolving asset:', error);
            setErrorMessage(`Error while resolving asset: ${error.message}`);
        }
        setIsSubmitting(false);
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="uris"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URIs</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="watcloud://..." {...field} />
                                </FormControl>
                                <FormDescription>
                                    WATcloud URIs, one per line.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <>Submitting...</> : <>Submit</>}
                    </Button>
                </form>
            </Form>
            <h4 className="mt-8 mb-4 text-md">Results</h4>
            {resolvedResults.length > 0 && (
                resolvedResults.map((res, i) => (
                    <div key={res.uri}>
                        {i !== 0 && (<Separator className="my-6" />)}
                        <span className="text-sm text-gray-500">URI</span>
                        <Pre hasCopyCode className="-mt-5"><Code>{res.uri}</Code></Pre>
                        {'result' in res && (
                            <>
                                <span className="text-sm text-gray-500">Resolved</span>
                                <Pre hasCopyCode className="-mt-5"><Code>{res.result.url}</Code></Pre>
                                {res.result.lastModified && (
                                    <>
                                        <span className="text-sm text-gray-500 block">Last Modified</span>
                                        <Pre hasCopyCode className="-mt-5"><Code>{dayjs().to(res.result.lastModified)} ({res.result.lastModified.toISOString()})</Code></Pre>
                                    </>

                                )}
                                <>
                                    <span className="text-sm text-gray-500 block">Expires</span>
                                    <Pre hasCopyCode className="-mt-5"><Code>{
                                        res.result.expiresAt ? 
                                            `${dayjs().to(res.result.expiresAt)} (${res.result.expiresAt.toISOString()})` :
                                            'Never'
                                    }</Code></Pre>
                                </>
                                {res.result.headers && (
                                    <>
                                        <span className="text-sm text-gray-500 block">Raw Headers</span>
                                        <Pre hasCopyCode className="-mt-5"><Code>{JSON.stringify(Object.fromEntries(res.result.headers), null, 2)}</Code></Pre>
                                    </>
                                )}
                            </>
                        )}
                        {'error' in res && (
                            <span className="text-red-500">{res.error.message}</span>
                        )}
                    </div>
                ))
            )}
            {errorMessage && (
                <div>
                    <span className="text-red-500">{errorMessage}</span>
                </div>
            )}
            {resolvedResults.length === 0 && !errorMessage && (
                <p className="text-sm text-gray-500">No results yet. Submit a URI to get started!</p>
            )}
        </>
    );
}


const UPLOADER_MAX_FILE_SIZE = 100 * Math.pow(1024, 2); // Math.pow(1024, 2) = 1MB
const UPLOADER_S3_HOST = 'https://rgw.watonomous.ca';
const UPLOADER_S3_BUCKET = "asset-temp";

export function AssetUploader() {
    const { theme } = useTheme();
    const uppyTheme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'auto';

    const [successfulUploads, setSuccessfulUploads] = useState<{
        name: string;
        uri: string;
    }[]>([]);
    const [errorMessages, setErrorMessages] = useState<string[]>([]);

    // IMPORTANT: passing an initializer function to prevent Uppy from being reinstantiated on every render.
    const [uppy] = useState(() => new Uppy({
        restrictions: {
            maxFileSize: UPLOADER_MAX_FILE_SIZE,
        },
    })
    .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
            const hash = sha256(await file.data.arrayBuffer());
            sha256Cache.set(file.id, hash);

            return {
                method: 'PUT',
                url: `${UPLOADER_S3_HOST}/${UPLOADER_S3_BUCKET}/${hash}`,
            };
        }
    }));

    useEffect(() => {
        function handleUpload() {
            setErrorMessages([]);
        }
        async function handleUploadSuccess(file: UppyFile | undefined, response: SuccessResponse) {
            if (!file) {
                console.warn('Got upload success event without a file:', response)
                return;
            }
            const hash = sha256Cache.get(file.id) || sha256(await file.data.arrayBuffer());
            const watcloudURI = `watcloud://v1/sha256:${hash}?name=${encodeURIComponent(file.name)}`;
            console.log('Uploaded file:', file, 'Response:', response, 'watcloud URI:', watcloudURI);

            setSuccessfulUploads((prev) => [{
                name: file.name,
                uri: watcloudURI,
            }, ...prev]);
        }
        function handleUppyError(file: UppyFile | undefined, error: any) {
            console.error('Failed upload:', file, "Error:", error, "Response status:", error.source?.status);
            setErrorMessages((prev) => [`Failed to upload ${file?.name}: "${error.message}", response status: "${error.source?.status}", response body: "${error.source?.responseText}"`, ...prev]);
        }


        uppy.on("upload", handleUpload);
        uppy.on('upload-success', handleUploadSuccess);
        uppy.on('upload-error', handleUppyError);
        return () => {
            uppy.off("upload", handleUpload);
            uppy.off('upload-success', handleUploadSuccess);
            uppy.off('upload-error', handleUppyError);
        };
    }, [uppy])

    return (
        <>
        <Dashboard
            uppy={uppy}
            note={`Maximum file size: ${bytesToSize(UPLOADER_MAX_FILE_SIZE, 0)}`}
            width="100%"
            theme={uppyTheme}
            showProgressDetails={true}
        />
        <h4 className="mt-8 mb-4 text-md">Successful Uploads</h4>
        {successfulUploads.map(({name, uri}) => (
            <div key={uri}>
                <span className="text-sm text-gray-500">{name}</span>
                <Pre hasCopyCode className="-mt-5"><Code>{uri}</Code></Pre>
            </div>
        ))}
        {successfulUploads.length === 0 && (
            <p className="text-sm text-gray-500">No successful uploads yet. Upload a file to get started!</p>
        )}
        {errorMessages.length > 0 && (
            <>
                <h4 className="mt-8 mb-4 text-md">Errors</h4>
                {errorMessages.map((message, i) => (
                    <div key={i}>
                        <span className="text-red-500">{message}</span>
                    </div>
                ))}
            </>
        )}
        </>
    );
}
