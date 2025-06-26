import { Button } from "@/components/ui/button"
import { Link } from "nextra-theme-docs"
import {
    bytesToSize,
    pluralizeWithCount,
    cn,
} from '@/lib/utils'
import heroStyles from '@/styles/hero.module.css'
import { machineInfo } from '@/lib/data'

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
        <div className="hero">
            <div className="hero-inner">
                <h1 className="hero-title">
                    {vCPUs} vCPUs<br />
                    {bytesToSize(ramBytes,0)} RAM<br />
                    {bytesToSize(redundantStorageBytes,0)} Storage<br />
                    {pluralizeWithCount(gpuCount, "GPU")}<br />
                    {"10/40 Gbps Network"}
                </h1>
                <p className="hero-subtitle">Welcome to WATcloud. We make powerful computers <br className='sm:block hidden'/>easily accessible to students and researchers.</p>
                <div className="hero-subtitle">
                    <Link className={cn(heroStyles['cta-btn'],heroStyles['secondary'],"mr-4")} href="/machines">View Specs</Link>
                    <Link className={heroStyles['cta-btn']} href="/docs">Learn More <span>→</span></Link>
                </div>
            </div>
            <style jsx>{`
            .hero {
            }
            .hero-inner {
                max-width: 90rem;
                padding-left: max(env(safe-area-inset-left),1.5rem);
                padding-right: max(env(safe-area-inset-right),1.5rem);
                margin: 0 auto;
            }
            .hero-title {
                display: inline-flex;
                font-size: 3.125rem;
                font-size: min(4.375rem, max(8vw, 2.5rem));
                font-weight: 700;
                font-feature-settings: initial;
                letter-spacing: -.12rem;
                margin-left: -0.2rem;
                margin-top: 3.4rem;
                line-height: 1.1;
                background-image: linear-gradient(146deg,#000,#757a7d);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            :global(.dark) .hero-title {
                background-image: linear-gradient(146deg,#fff,#757a7d);
            }
            .hero-subtitle {
                font-size: 1.3rem;
                font-size: min(1.3rem, max(3.5vw, 1.2rem));
                font-feature-settings: initial;
                line-height: 1.6;
                margin-top: 1.5rem;
            }
            @media screen and (max-width: 768px) {
                .hero-title {
                font-size: 2.5rem;
                }
            }
            `}</style>
        </div>
    )
}