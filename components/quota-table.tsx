import { machineInfo } from '@/lib/data'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { chain } from "@/lib/utils";

function formatLimit(limit: number | string) {
    if (limit === 0 || limit === '0') {
        return 'unlimited'
    }
    return limit
}

export function GlobalQuotaTable({
    className = "",
}: {
    className?: string
}) {
    const rows = []
    for (const quota of machineInfo.global_user_disk_quotas) {
        rows.push(
            <TableRow>
                <TableCell>{quota.name}</TableCell>
                <TableCell className='text-center'>{quota.fstype}</TableCell>
                <TableCell className='text-center'>{formatLimit(quota.default.bytes_hard_limit)}</TableCell>
                <TableCell className='text-center'>{formatLimit(quota.default.inodes_hard_limit)}</TableCell>
            </TableRow>
        )
    }

    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className='text-center'>FS Type</TableHead>
                    <TableHead className='text-center'>Size Limit (bytes)</TableHead>
                    <TableHead className='text-center'>Inode Limit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
        </Table>
    )
}

export function NodeLocalQuotaTable({
    className = "",
}: {
    className?: string
}) {
    const rows = []
    for (const machine of chain(machineInfo.machines.slurm_login_nodes)) {
        for (const mount of (machine.mounts_with_quotas || [])) {
            rows.push(
                <TableRow>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>{mount.name}</TableCell>
                    <TableCell>{mount.mountpoint}</TableCell>
                    <TableCell className='text-center'>{mount.fstype}</TableCell>
                    <TableCell className='text-center'>{formatLimit(mount.user_quota.default.bytes_soft_limit)}</TableCell>
                    <TableCell className='text-center'>{formatLimit(mount.user_quota.default.bytes_hard_limit)}</TableCell>
                    <TableCell className='text-center'>{formatLimit(mount.user_quota.default.inodes_soft_limit)}</TableCell>
                    <TableCell className='text-center'>{formatLimit(mount.user_quota.default.inodes_hard_limit)}</TableCell>
                </TableRow>
            )
        }
    }

    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    <TableHead>Node</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mount Point</TableHead>
                    <TableHead className='text-center'>FS Type</TableHead>
                    <TableHead colSpan={2} className='text-center'>Size Limit (bytes)</TableHead>
                    <TableHead colSpan={2} className='text-center'>Inode Limit</TableHead>
                </TableRow>
                <TableRow>
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                    <TableHead className='text-center'></TableHead>
                    <TableHead className='text-center'>Soft</TableHead>
                    <TableHead className='text-center'>Hard</TableHead>
                    <TableHead className='text-center'>Soft</TableHead>
                    <TableHead className='text-center'>Hard</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
        </Table>
    )
}

export function CPURAMQuotaTable({
    className = "",
}: {
    className?: string
}) {
    const rows = []
    for (const machine of chain(machineInfo.machines.slurm_login_nodes)) {
        rows.push(
            <TableRow>
                <TableCell>{machine.name}</TableCell>
                <TableCell className='text-center'>{machine.cpu_quota}</TableCell>
                <TableCell className='text-center'>{machine.memory_quota}</TableCell>
            </TableRow>
        )
    }

    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    <TableHead>Node</TableHead>
                    <TableHead className='text-center'>CPU Quota (% of 1 core)</TableHead>
                    <TableHead className='text-center'>Memory Quota (bytes)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
        </Table>
    )
}
