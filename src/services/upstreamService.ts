import { CatalogItem } from "../models/catalogItem";
import { UpstreamInfo } from "../models/upstream";

const PRICE_STEP = 25;
const FAILURE_RATE = 0.1;
const SLOW_RATE = 0.05;
const TIMEOUT_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function simulateUpstream(item: CatalogItem): Promise<UpstreamInfo> {
    await sleep(Math.random() < SLOW_RATE ? 3000 : randomInt(100, 1000));

    if (Math.random() < FAILURE_RATE) {
        throw new Error("Upstream provider unavailable.");
    }

    const shifted = item.basePrice + randomInt(-2, 2) * PRICE_STEP;
    const price = shifted < item.basePrice / 2 ? item.basePrice : shifted;

    return {
        price,
        available: Math.random() < 0.85,
        deliveryEstimateMins: randomInt(4, 9) * 5
    }
}

export async function fetchUpstreamInfo(item: CatalogItem): Promise<UpstreamInfo> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Upstream provider timed out.")), TIMEOUT_MS);
    });

    try {
        return await Promise.race([simulateUpstream(item), timeout]);
    } finally {
        clearTimeout(timer);
    }
}