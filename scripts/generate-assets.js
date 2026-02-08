const { sha256 } = require('js-sha256');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dedent = require('dedent');
const os = require('os');
const slugify = require('slugify');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const assetConfig = require("./asset-config.json");

const axiosConfig = { proxy: false }
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
    axiosConfig.httpsAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || process.env.https_proxy);
}
if (process.env.HTTP_PROXY || process.env.http_proxy) {
    axiosConfig.httpAgent = new HttpsProxyAgent(process.env.HTTP_PROXY || process.env.http_proxy);
}
const axiosInstance = axios.create(axiosConfig);

const USER_PROFILES_PATH = path.resolve(process.argv[2]);
if (!USER_PROFILES_PATH) {
    console.error("Please provide a path to the user profiles JSON file");
    process.exit(1);
}
if (!fs.existsSync(USER_PROFILES_PATH)) {
    console.error(`User profiles file "${USER_PROFILES_PATH}" does not exist`);
    process.exit(1);
}

const OUTPUT_DIR = process.argv[3];
if (!OUTPUT_DIR) {
    console.error("Please provide an output directory");
    process.exit(1);
}
if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`Output directory "${OUTPUT_DIR}" does not exist`);
    process.exit(1);
}

const CACHE_DIR = process.argv[4] || os.tmpdir();

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(path.join(OUTPUT_DIR, "images"), { recursive: true });

// MARK: Image Helpers

const RESOLVER_URL_PREFIXES = [
    "https://rgw.watonomous.ca/asset-perm",
    "https://rgw.watonomous.ca/asset-off-perm",
    "https://rgw.watonomous.ca/asset-temp",
]

function extractSha256(str) {
    const sha256Match = str.match(/sha256:([a-f0-9]{64})/);
    if (!sha256Match) {
        throw new Error("Invalid string: does not contain a SHA-256 hash.");
    }
    return sha256Match[1];
}

class WATcloudURI extends URL {
    constructor(input) {
        super(input);
        if (this.protocol !== "watcloud:") {
            throw new Error("Invalid WATcloud URI: protocol must be 'watcloud:'");
        }
        if (this.hostname !== "v1") {
            throw new Error(`Invalid WATcloud URI: unsupported version "${this.hostname}". Only 'v1' is supported`);
        }
        this.sha256 = extractSha256(this.pathname);
        if (this.searchParams.has("name")) {
            this.name = this.searchParams.get("name");
        }
    }

    async resolveToURL() {
        const errors = [];
        for (const prefix of RESOLVER_URL_PREFIXES) {
            const r = `${prefix}/${this.sha256}`;
            try {
                await axiosInstance.head(r);
                return r;
            } catch (error) {
                errors.push(error);
            }
        }

        throw new Error(`Asset not found: ${this}. Errors:\n${errors.map(e => e.message).join("\n")}`);
    }
}

async function processImage(image, preprocessSteps = []) {
    const imageURI = new WATcloudURI(image.uri);

    const cacheDir = path.join(CACHE_DIR, `${imageURI.sha256}`);
    const originalPath = path.join(cacheDir, "original");

    if (fs.existsSync(originalPath)) {
        console.log(`Using cached version of ${image.name} (sha256:${imageURI.sha256})`)
    } else {
        await fs.promises.mkdir(cacheDir, { recursive: true });


        const url = await imageURI.resolveToURL();
        console.log(`Downloading and processing ${image.name} from ${url}`);
        const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
        const buffer = response.data;
        const sha256Hash = sha256(Buffer.from(buffer));
        if (sha256Hash !== imageURI.sha256) {
            throw new Error(`SHA-256 hash mismatch for "${image.name}"! Expected ${imageURI.sha256}, got ${sha256Hash}`);
        }
        // Perform an atomic write to prevent partial files
        await fs.promises.writeFile(originalPath + ".partial", Buffer.from(buffer));
        await fs.promises.rename(originalPath + ".partial", originalPath);
    }

    let sharpImage = sharp(originalPath);
    for (const fn of preprocessSteps) {
        sharpImage = await fn(sharpImage);
    }

    // Optimization params derived from:
    // https://github.com/343dev/optimizt/blob/46bec479c26a3e81b83ed1269780506f5a00efb5/.optimiztrc.js
    const avifOptions = image.optimize ? {
        quality: 50, // quality, integer 1-100
        lossless: false, // use lossless compression
        effort: 4, // CPU effort, between 0 (fastest) and 9 (slowest)
        chromaSubsampling: '4:2:0', // set to '4:4:4' to prevent chroma subsampling otherwise defaults to '4:2:0' chroma subsampling
    } : {};
    const avifCacheName = `${image.name}-${slugify(JSON.stringify(avifOptions), { lower: true, strict: true })}.avif`;
    
    const webpOptions = image.optimize ? {
        quality: 50, // quality, integer 1-100
        alphaQuality: 100, // quality of alpha layer, integer 0-100
        lossless: false, // use lossless compression mode
        nearLossless: false, // use near_lossless compression mode
        smartSubsample: false, // use high quality chroma subsampling
        effort: 6, // CPU effort, between 0 (fastest) and 6 (slowest)
        minSize: false, // prevent use of animation key frames to minimise file size (slow)
        mixed: false, // allow mixture of lossy and lossless animation frames (slow)
    } : {};
    const webpCacheName = `${image.name}-${slugify(JSON.stringify(webpOptions), { lower: true, strict: true })}.webp`;
    
    const jpgOptions = image.optimize ? {
        quality: 50, // quality, integer 1-100
        progressive: true, // use progressive (interlace) scan
        optimizeScans: true, // optimise progressive scans, forces progressive
        chromaSubsampling: '4:2:0', // set to '4:4:4' to prevent chroma subsampling otherwise defaults to '4:2:0' chroma subsampling
        optimizeCoding: true, // optimise Huffman coding tables
        mozjpeg: false, // use mozjpeg defaults, equivalent to { trellisQuantisation: true, overshootDeringing: true, optimiseScans: true, quantisationTable: 3 }
        trellisQuantisation: true, // apply trellis quantisation
        overshootDeringing: true, // apply overshoot deringing
        quantizationTable: 3, // quantization table to use, integer 0-8
    } : {};
    const jpgCacheName = `${image.name}-${slugify(JSON.stringify(jpgOptions), { lower: true, strict: true })}.jpg`;

    if (!fs.existsSync(path.join(cacheDir, avifCacheName))) {
        await sharpImage.avif(avifOptions).toFile(path.join(cacheDir, avifCacheName + ".partial"));
        await fs.promises.rename(path.join(cacheDir, avifCacheName + ".partial"), path.join(cacheDir, avifCacheName));
    }
    if (!fs.existsSync(path.join(cacheDir, webpCacheName))) {
        await sharpImage.webp(webpOptions).toFile(path.join(cacheDir, webpCacheName + ".partial"));
        await fs.promises.rename(path.join(cacheDir, webpCacheName + ".partial"), path.join(cacheDir, webpCacheName));
    }
    if (!fs.existsSync(path.join(cacheDir, jpgCacheName))) {
        await sharpImage.jpeg(jpgOptions).toFile(path.join(cacheDir, jpgCacheName + ".partial"));
        await fs.promises.rename(path.join(cacheDir, jpgCacheName + ".partial"), path.join(cacheDir, jpgCacheName));
    }

    await Promise.all([
        fs.promises.copyFile(path.join(cacheDir, avifCacheName), path.join(OUTPUT_DIR, "images", `${image.name}.avif`)),
        fs.promises.copyFile(path.join(cacheDir, webpCacheName), path.join(OUTPUT_DIR, "images", `${image.name}.webp`)),
        fs.promises.copyFile(path.join(cacheDir, jpgCacheName), path.join(OUTPUT_DIR, "images", `${image.name}.jpg`)),
    ])
}

async function processSvg(svg) {
    const svgURI = new WATcloudURI(svg.uri);

    const cacheDir = path.join(CACHE_DIR, `${svgURI.sha256}`);
    const originalPath = path.join(cacheDir, "original");

    let fileExists = false;
    try {
        await fs.promises.access(originalPath);
        fileExists = true;
        console.log(`Using cached version of ${svg.name} (sha256:${svgURI.sha256})`);
    } catch {
    }

    if (!fileExists) {
        await fs.promises.mkdir(cacheDir, { recursive: true });

        const url = await svgURI.resolveToURL();
        console.log(`Downloading ${svg.name} from ${url}`);
        const response = await axiosInstance.get(url, { responseType: 'arraybuffer' });
        const buffer = response.data;

        if (sha256(buffer) !== svgURI.sha256) {
            throw new Error(`SHA-256 hash mismatch for "${svg.name}"! Expected ${svgURI.sha256}, got ${sha256(buffer)}`);
        }

        await fs.promises.writeFile(originalPath + ".partial", buffer);
        await fs.promises.rename(originalPath + ".partial", originalPath);
    }

    const svgContent = await fs.promises.readFile(originalPath, 'utf8');
    const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
    const widthMatch = svgContent.match(/width=["']([^"']+)["']/i);
    const heightMatch = svgContent.match(/height=["']([^"']+)["']/i);
    
    let width = 1000;
    let height = 1000;
    
    if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
        if (parts.length >= 4) {
            const vbWidth = parseFloat(parts[2]);
            const vbHeight = parseFloat(parts[3]);
            if (!Number.isNaN(vbWidth)) width = Math.round(vbWidth);
            if (!Number.isNaN(vbHeight)) height = Math.round(vbHeight);
        }
    } else if (widthMatch && heightMatch) {
        const w = parseFloat(widthMatch[1]);
        const h = parseFloat(heightMatch[1]);
        if (!Number.isNaN(w)) width = Math.round(w);
        if (!Number.isNaN(h)) height = Math.round(h);
    }
    
    const base64 = Buffer.from(svgContent).toString('base64');
    const dataUri = `data:image/svg+xml;base64,${base64}`;
    
    return {
        name: svg.name,
        src: dataUri,
        width,
        height
    };
}

// Derived from https://stackoverflow.com/a/53952925/4527337
function toPascalCase(string) {
  return `${string}`
    .toLowerCase()
    .replace(new RegExp(/[-_]+/, 'g'), ' ')
    .replace(new RegExp(/[^\w\s]/, 'g'), '')
    .replace(
      new RegExp(/\s+(.)(\w*)/, 'g'),
      ($1, $2, $3) => `${$2.toUpperCase() + $3}`
    )
    .replace(new RegExp(/\w/), s => s.toUpperCase());
}

function generateTypescript(image_names, svg_data) {
    const preamble = dedent`
        // This file is automatically generated. Please do not edit.
        import { StaticImageData } from "next/image"

        export type WATcloudStaticImage = {
            avif: StaticImageData,
            webp: StaticImageData,
            jpg: StaticImageData,
        }

        export type WATcloudStaticSVG = StaticImageData;

        const allImages: Record<string, WATcloudStaticImage> = {};
        const allSVGs: Record<string, WATcloudStaticSVG> = {};
    `;

    const imageImports = image_names.map((image_name) => {
        const pascalName = toPascalCase(image_name);
        return dedent`
            import ${pascalName}Avif from "./images/${image_name}.avif";
            import ${pascalName}Webp from "./images/${image_name}.webp";
            import ${pascalName}Jpg from "./images/${image_name}.jpg";

            export const ${pascalName}: WATcloudStaticImage = {
                avif: ${pascalName}Avif,
                webp: ${pascalName}Webp,
                jpg: ${pascalName}Jpg,
            };

            allImages["${image_name}"] = ${pascalName};
        `;
    });

    const svgImports = svg_data.map((svg) => {
        const pascalName = toPascalCase(svg.name);
        return dedent`
            export const ${pascalName}: WATcloudStaticSVG = {
                src: "${svg.src}",
                width: ${svg.width},
                height: ${svg.height},
            };

            allSVGs["${svg.name}"] = ${pascalName};
        `;
    });

    const postamble = dedent`
        export { allImages, allSVGs };
    `;

    const content = [preamble, ...imageImports, ...svgImports, postamble].join("\n\n");

    return content;
}

(async () => {
    const pLimit = (await import('p-limit')).default;

    const concurrencyLimiter = pLimit(process.env.FETCH_CONCURRENCY ? parseInt(process.env.FETCH_CONCURRENCY) : 4);

    // MARK: Profile Pictures
    console.log("Processing profile pictures...")
    const USER_PROFILES = require(USER_PROFILES_PATH)

    const user_profile_images = Object.entries(USER_PROFILES).map(([username, profile]) => ({
        name: `user-${username}`,
        uri: new WATcloudURI(profile.watcloud_public_profile.profile_picture)
    }));

    await Promise.all(user_profile_images.map(image => concurrencyLimiter(() => processImage(image, [(sharpImage) => sharpImage.resize(200, 200)]))));

    // MARK: Images
    console.log("Processing images...")
    const IMAGES = assetConfig.images;
    await Promise.all(IMAGES.map(image => concurrencyLimiter(() => processImage(image))));

    // MARK: SVGs
    console.log("Processing SVGs...")
    const SVGS = assetConfig.svgs || [];
    const svgData = await Promise.all(SVGS.map(svg => concurrencyLimiter(() => processSvg(svg))));

    // MARK: Generate images.ts
    const tsContent = generateTypescript(
        [...user_profile_images, ...IMAGES].map((image) => image.name),
        svgData
    );
    await fs.promises.writeFile(path.join(OUTPUT_DIR, "images.ts"), tsContent);

    console.log("Assets generated successfully");
})().catch((err) => {
    console.error(err);
    process.exit(1);
});