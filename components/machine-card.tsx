import { useState } from 'react'
import useSWR from 'swr'
import {
    HelpCircle,
    Circle,
    Copy,
    Check,
} from "lucide-react"
import {
    bytesToSize,
    pluralize,
    pluralizeWithCount,
    fetcher,
    stripPrefix,
    HealthchecksioCheck,
    HealthchecksioCheckProcessed,
    UnionOfElementTypes,
} from "@/lib/utils"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Code } from "nextra/components"
import { Link } from "nextra-theme-docs"
import { MachineInfo, websiteConfig } from '@/lib/data'
import { hostnameSorter } from '@/lib/wato-utils'

function CopyableCodeBlock({ content }: { content: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="relative group">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy to clipboard"
            >
                {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <pre className="rounded-md bg-gray-900 p-4 pr-12 text-sm text-gray-100 font-mono whitespace-pre overflow-x-auto">
                {content}
            </pre>
        </div>
    )
}

export function MachineCard({
    machine,
}: {
    machine: UnionOfElementTypes<MachineInfo["machines"]>,
}) {
    const { data, error, isLoading }: {
        data?: HealthchecksioCheckProcessed[],
        error?: any,
        isLoading?: boolean,
    } = useSWR(
        [`https://healthchecks.io/api/v2/checks/`, websiteConfig.healthchecksio_read_key],
        ([url, key]) => fetcher(url, {
            headers: {
                'X-Api-Key': key,
            },
        }).then(data => data['checks'].map((check: HealthchecksioCheck) => ({
            ...check,
            tags: check['tags'].split(' ')
        }))),
        {
            refreshInterval: 10000, // milliseconds
        }
    )

    const machineChecks = data?.filter(check => check.tags.includes(`host=${machine.name}`) && check.tags.includes(`public=True`))

    let machineHealthColor;
    let machineHealthDescription;
    if (machineChecks?.length) {
        if (machineChecks.every(check => check.status === "down")) {
            machineHealthColor = "red"
            machineHealthDescription = `${machine.name} is down`
        } else if (machineChecks.every(check => ["up", "grace"].includes(check.status))) {
            machineHealthColor = "green"
            machineHealthDescription = `${machine.name} is healthy`
        } else {
            machineHealthColor = "orange"
            machineHealthDescription = `${machine.name} is partially down`
        }
    } else if (isLoading) {
        machineHealthColor = "gray"
        machineHealthDescription = `Loading health status for ${machine.name}...`
    } else if (error) {
        machineHealthColor = "gray"
        machineHealthDescription = `Error getting health status for ${machine.name}`
    } else {
        machineHealthColor = "gray"
        machineHealthDescription = `${machine.name} did not report any health information`
    }

    const machineHealthSummary = machineChecks?.length ? (
        <Table>
            <TableBody>
                {machineChecks.map((check) => {
                    const indicatorColor =
                        check.status === "down"
                            ? "red"
                            : ["up", "grace"].includes(check.status)
                                ? "green"
                                : "gray";
                    return (
                        <TableRow key={check.slug} className="hover:bg-inherit border-b-0">
                            <TableCell className="p-0.5">
                                {stripPrefix(check.name, `${machine.name}-`)}
                            </TableCell>
                            <TableCell className="p-0.5">
                                <Circle
                                    size="10"
                                    className="inline-flex mr-2 my-0.5"
                                    fill={indicatorColor}
                                    color={indicatorColor}
                                />
                                {check.status}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    ) : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="mb-1">
                    {machine.name}
                    <Popover>
                        <PopoverTrigger>
                            <Circle size="10" className="inline-flex align-baseline ml-2 my-0.5" fill={machineHealthColor} color={machineHealthColor} />
                        </PopoverTrigger>
                        <PopoverContent side="top">
                            <p>{machineHealthDescription}</p>
                            {machineHealthSummary}
                        </PopoverContent>
                    </Popover>
                    {
                        machine.tags.map(({ name, description }) => (
                            <span key={name} className="ml-2 mr-1">
                                <Popover>
                                    <PopoverTrigger><Badge className="align-bottom">{name}</Badge></PopoverTrigger>
                                    <PopoverContent side="top">{description}</PopoverContent>
                                </Popover>
                            </span>
                        ))
                    }
                </CardTitle>
                <CardDescription>{
                    `${pluralizeWithCount(parseInt(machine.cpu_info['logical_processors'] || "0"), "CPU")}`
                    + `, ${bytesToSize(parseInt(machine.memory_info["memory_total_kibibytes"] || "0") * 1024, 0)} RAM`
                    + ('gpus' in machine && machine.gpus?.length ? `, ${pluralizeWithCount(machine.gpus.length, "GPU")}` : "")
                }</CardDescription>
            </CardHeader>
            <CardContent className="grid text-sm">
                <dl className="text-gray-900 divide-y divide-gray-200 dark:text-white dark:divide-gray-700 overflow-hidden">
                    {'hostnames' in machine && machine.hostnames?.length ? (
                        <div className="flex flex-col py-3 first:pt-0">
                            <dt className="mb-1 text-gray-500 dark:text-gray-400">{pluralize(machine.hostnames.length, "Hostname")}
                                <Popover>
                                    <PopoverTrigger><HelpCircle className="ml-1 mr-1 h-3 w-3 text-muted-foreground" /></PopoverTrigger>
                                    <PopoverContent side="top">
                                        <p className="mb-2">Hostnames ending in <Code>.ext.watonomous.ca</Code> resolve to external IP addresses. They are accessible from outside the cluster.</p>
                                        <p className="mb-2">Hostnames ending in <Code>.cluster.watonomous.ca</Code> resolve to internal IP addresses in the cluster. They are accessible only from within the cluster.</p>
                                        <p>There may be other hostnames that resolve to this machine that are for internal use.</p>
                                    </PopoverContent>
                                </Popover>
                            </dt>
                            <dd className="font-medium">
                                <ul className="list-none">
                                    {machine.hostnames.length ? machine.hostnames.sort(hostnameSorter).map((hostname, index) => {
                                        return (
                                            <li key={index} className="my-0">
                                                {hostname}
                                            </li>
                                        )
                                    }) : "None"}
                                </ul>
                            </dd>
                        </div>
                    ) : undefined}
                    {'lsb_release_info' in machine && machine.lsb_release_info ? (
                        <div className="flex flex-col py-3 first:pt-0">
                            <dt className="mb-1 text-gray-500 dark:text-gray-400">OS</dt>
                            <dd className="font-medium">{machine.lsb_release_info['description']}</dd>
                        </div>
                    ) : undefined}
                    <div className="flex flex-col py-3 first:pt-0">
                        <dt className="mb-1 text-gray-500 dark:text-gray-400">
                            <span>CPU</span>
                        </dt>
                        <dd className="font-medium">{machine.cpu_info['model']}</dd>
                    </div>
                    <div className="flex flex-col py-3 first:pt-0">
                        <dt className="mb-1 text-gray-500 dark:text-gray-400">
                            <Popover>
                                <span>Logical Processors{<PopoverTrigger><HelpCircle className="ml-1 mr-1 h-3 w-3 text-muted-foreground" /></PopoverTrigger>}</span>
                                <PopoverContent side="top">
                                    <p>The total number of logical processors available to the machine. This is often <Code>num_physical_cores * num_threads_per_core.</Code></p>
                                </PopoverContent>
                            </Popover>
                        </dt>
                        <dd className="font-medium">{machine.cpu_info['logical_processors']}</dd>
                    </div>
                    <div className="flex flex-col py-3 first:pt-0">
                        <dt className="mb-1 text-gray-500 dark:text-gray-400">RAM</dt>
                        <dd className="font-medium">{bytesToSize(parseInt(machine.memory_info["memory_total_kibibytes"] || "0") * 1024, 0)}</dd>
                    </div>
                    {'gpus' in machine && machine.gpus.length ? (
                        <div className="flex flex-col py-3 first:pt-0">
                            <dt className="mb-1 text-gray-500 dark:text-gray-400">{pluralize(machine.gpus.length, "GPU")}</dt>
                            <dd className="font-medium">
                                <ol start={0}>
                                    {machine.gpus.length ? machine.gpus.map((gpu, index) => {
                                        return (
                                            <li key={index} className="my-0">
                                                {gpu['name']} ({gpu['memory.total [MiB]']} VRAM)
                                            </li>
                                        )
                                    }) : "None"}
                                </ol>
                            </dd>
                        </div>
                    ) : undefined}
                    {'hosted_storage' in machine && machine.hosted_storage.length ? (
                        <div className="flex flex-col py-3 first:pt-0">
                            <dt className="mb-1 text-gray-500 dark:text-gray-400">Hosted Storage</dt>
                            <dd className="font-medium">
                                <ol start={0}>
                                    {machine.hosted_storage.length ? machine.hosted_storage.map((storage, index) => {
                                        return (
                                            <li key={index} className="my-0">
                                                {storage['mountpoint']} ({bytesToSize(parseInt(storage['size_bytes'] || "0"), 0)})
                                            </li>
                                        )
                                    }) : "None"}
                                </ol>
                            </dd>
                        </div>
                    ) : undefined}
                    {'ssh_host_keys' in machine && machine.ssh_host_keys?.length ? (
                        <div className="flex flex-col py-3 first:pt-0">
                            <dt className="mb-1 text-gray-500 dark:text-gray-400">{pluralize(machine.ssh_host_keys.length, "SSH Host Key")}</dt>
                            <dd>
                                <CopyableCodeBlock content={machine.ssh_host_keys.join('\n')} />
                            </dd>
                        </div>
                    ) : undefined}
                </dl>
            </CardContent>
        </Card>
    )
}
