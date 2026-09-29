import { Button } from "@/components/ui/button"
import { Link } from "nextra-theme-docs"
import {
    bytesToSize,
    pluralizeWithCount,
    cn,
} from '@/lib/utils'
import heroStyles from '@/styles/hero.module.css'
import { machineInfo } from '@/lib/data'
import { WatcloudHomeBackground } from '@/build/fixtures/images'

const DEV_MACHINES = [
    ...machineInfo.machines.slurm_compute_nodes,
    ...machineInfo.machines.slurm_login_nodes,
]

export function Hero() {
    const vCPUs = DEV_MACHINES.reduce((acc, m) => acc + parseInt(m.cpu_info.logical_processors || "0"), 0)
    const ramBytes = DEV_MACHINES.reduce((acc, m) => acc + parseInt(m.memory_info.memory_total_kibibytes || "0") * 1024, 0)
    const redundantStorageBytes = machineInfo.machines.bare_metals.flatMap(m => m.hosted_storage.map(s => parseInt(s.size_bytes || "0"))).reduce((acc, size) => acc + size, 0)
    const gpuCount = DEV_MACHINES.reduce((acc, m) => acc + m.gpus.length, 0)
    
    return (
        <div className={heroStyles['hero']} style={{ margin: 0, padding: 0, position: 'relative', width: '100vw', marginLeft: 'calc(-50vw + 50%)', minHeight: '100vh', marginTop: '-1rem', marginBottom: '-6rem' }}>
            <div className={heroStyles['hero-background']} style={{ backgroundImage: `url(${WatcloudHomeBackground.src})` }}></div>
            <div className={heroStyles['hero-inner']} style={{ margin: '0 auto', padding: '2rem', marginBottom: '0' }}>
                <h1 className={heroStyles['hero-title']}>
                    {vCPUs} vCPUs<br />
                    {bytesToSize(ramBytes,0)} RAM<br />
                    {bytesToSize(redundantStorageBytes,0)} Storage<br />
                    {pluralizeWithCount(gpuCount, "GPU")}<br />
                    {"10/40 Gbps Network"}
                </h1>
                <p className={heroStyles['hero-subtitle']}>Welcome to WATcloud. We make powerful computers <br className='sm:block hidden'/>easily accessible to students and researchers.</p>
                <div className={heroStyles['hero-subtitle']}>
                    <Link className={cn(heroStyles['cta-btn'],heroStyles['secondary'],"mr-4")} href="/machines">View Specs</Link>
                    <Link className={heroStyles['cta-btn']} href="/docs">Learn More <span>→</span></Link>
                </div>
            </div>
        </div>
    )
}