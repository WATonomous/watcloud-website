import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Pre, Code } from 'nextra/components'
import stripIndent from 'strip-indent';
import {
    HelpCircle,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ComboBox } from '@/components/ui/combo-box'
import { Input } from "@/components/ui/input"
import { lookupStringMDX, sshInfo, sshInfoStrings } from '@/lib/data'
import { htmlEncode } from '@/lib/utils'

export function SSHCommandGenerator() {
    const router = useRouter()
    const queryMachineName = Array.isArray(router.query.machinename)
      ? router.query.machinename[0]
      : router.query.machinename || "";

    const instructionsRef = useRef<HTMLDivElement>(null)
    const machineNames = Object.keys(sshInfo) as (keyof typeof sshInfo)[]

    const [_machineName, setMachineName] = useState<keyof typeof sshInfo | "">("")
    const [username, _setUsername] = useState(() => {
        // Initialize from localStorage on first render
        if (typeof window !== 'undefined') {
            return localStorage.getItem("wato_ssh_command_generator_username") || ""
        }
        return ""
    })
    const [sshKeyPath, _setSSHKeyPath] = useState(() => {
        // Initialize from localStorage on first render
        if (typeof window !== 'undefined') {
            return localStorage.getItem("wato_ssh_command_generator_ssh_key_path") || ""
        }
        return ""
    })

    const machineName: keyof typeof sshInfo =
      _machineName ||
      (machineNames.includes(queryMachineName as keyof typeof sshInfo)
        ? queryMachineName
        : machineNames[0]) as keyof typeof sshInfo;

    function setUsername(u: string) {
        _setUsername(u)
        localStorage.setItem("wato_ssh_command_generator_username", u)
    }
    function setSSHKeyPath(p: string) {
        _setSSHKeyPath(p)
        localStorage.setItem("wato_ssh_command_generator_ssh_key_path", p)
    }
    function setUsernameEvt(e: React.ChangeEvent<HTMLInputElement>) {
        setUsername(e.target.value)
    }
    function setSSHKeyPathEvt(e: React.ChangeEvent<HTMLInputElement>) {
        setSSHKeyPath(e.target.value)
    }

    const displayUsername = (username || htmlEncode("<username>")).replace(/\$$/, "\\$")
    const displaySSHKeyPath = sshKeyPath || htmlEncode("<ssh_key_path>")

    // Replace placeholders in instructions
    useEffect(() => {
        if (instructionsRef.current) {
            const instructions = instructionsRef.current.querySelectorAll("code > span")
            instructions.forEach((instruction) => {
                if (!instruction.getAttribute("data-original-inner-html")) {
                    instruction.setAttribute("data-original-inner-html", instruction.innerHTML)
                }
                const originalInnerHTML = instruction.getAttribute("data-original-inner-html") || ''
                instruction.innerHTML = originalInnerHTML
                    .replace(/__SSH_USER__/g, displayUsername)
                    .replace(/__SSH_KEY_PATH__/g, displaySSHKeyPath)
            })
        }
    }, [displayUsername, displaySSHKeyPath, machineName])

    return (
        <>
            <dl className="text-gray-900 divide-y divide-gray-200 dark:text-white dark:divide-gray-700">
                <dt className="mb-1 mt-2 text-gray-500 dark:text-gray-400 border-none">Machine</dt>
                <dd className='border-none'>
                    <ComboBox
                        options={machineNames.map(m => ({value: m, label: m}))}
                        value={machineName}
                        setValue={setMachineName as any}
                        selectPlaceholder="Select machine"
                        searchPlaceholder="Find machine..."
                        emptySearchResultText="No machines found"
                        allowDeselect={false}
                    />
                </dd>
                <dt className="mb-1 mt-2 text-gray-500 dark:text-gray-400 border-none">
                    <Popover>
                        Compute Cluster Username{<PopoverTrigger><HelpCircle className="ml-1 mr-1 h-3 w-3 text-muted-foreground" /></PopoverTrigger>}
                        <PopoverContent side="top">
                            The username that you submitted via the onboarding form.
                        </PopoverContent>
                    </Popover>
                </dt>
                <dd className='border-none'>
                    <Input
                        type="text"
                        className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="E.g. jdoe"
                        value={username}
                        onChange={setUsernameEvt}
                        autoComplete='off'
                    />
                </dd>
                <dt className="mb-1 mt-2 text-gray-500 dark:text-gray-400 border-none">
                    <Popover>
                        SSH Key Path{<PopoverTrigger><HelpCircle className="ml-1 mr-1 h-3 w-3 text-muted-foreground" /></PopoverTrigger>}
                        <PopoverContent side="top">
                            The path to the SSH key that you submitted via the onboarding form.
                        </PopoverContent>
                    </Popover>
                </dt>
                <dd className='border-none'>
                    <Input
                        type="text"
                        className="focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="E.g. ~/.ssh/id_rsa"
                        value={sshKeyPath}
                        onChange={setSSHKeyPathEvt}
                        autoComplete='off'
                    />
                </dd>
            </dl>
            <div className="mt-8">
                <h4 className="text-xl font-semibold">Options</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Below are options for connecting to <span className="font-bold">{machineName}</span>.
                    Please choose the option that best fits your use case.
                </p>
            </div>
            <div ref={instructionsRef}>
            {
                sshInfo[machineName].paths.map(({hops, instructions}, i) => (
                    <div key={i} className="mt-8">
                        <h4 className="text-lg font-semibold">{hops.length === 1 ? "Direct Connection" : hops.join(" → ")}</h4>
                        <ol className='list-decimal ltr:ml-6 rtl:mr-6 mt-6'>
                            {instructions.map((instruction, j) => {
                                const MDXComponent = lookupStringMDX(sshInfoStrings, instruction)
                                return (
                                    <li key={j} className="my-2">
                                        <MDXComponent />
                                    </li>
                                )
                            })}
                        </ol>
                    </div>
                ))
            }
            </div>
        </>
    )
}
