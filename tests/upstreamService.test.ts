import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUpstreamInfo } from "../src/services/upstreamService";
import { CatalogItem } from "../src/models/catalogItem";

const item = (basePrice: number): CatalogItem => ({
    id: 1,
    name: "Test Item",
    restaurant: "Test Kitchen",
    category: "Test",
    description: "",
    basePrice,
    popularity: 50,
});

// Math.random is called in this order: slow check, latency, failure check,
// price step, availability, delivery estimate. The last value repeats.
const stubRandom = (...values: number[]) => {
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => values[Math.min(i++, values.length - 1)]);
};

describe("upstreamService", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("moves the price in R25 steps", async () => {
        // price step value 0.0 -> -2 steps, 0.5 -> 0 steps, 0.99 -> +2 steps
        stubRandom(0.5, 0, 0.5, 0.99, 0.5, 0.5);
        expect((await fetchUpstreamInfo(item(100))).price).toBe(150);

        vi.restoreAllMocks();
        stubRandom(0.5, 0, 0.5, 0.5, 0.5, 0.5);
        expect((await fetchUpstreamInfo(item(100))).price).toBe(100);

        vi.restoreAllMocks();
        stubRandom(0.5, 0, 0.5, 0.0, 0.5, 0.5);
        expect((await fetchUpstreamInfo(item(100))).price).toBe(50);
    });

    it("keeps the base price when a drop would go below half of it", async () => {
        stubRandom(0.5, 0, 0.5, 0.0, 0.5, 0.5); // -2 steps = R50 off
        expect((await fetchUpstreamInfo(item(69))).price).toBe(69);
    });

    it("reports availability and a delivery estimate in 5 minute steps", async () => {
        stubRandom(0.5, 0, 0.5, 0.5, 0.99, 0.0);
        const unavailable = await fetchUpstreamInfo(item(100));
        expect(unavailable.available).toBe(false);
        expect(unavailable.deliveryEstimateMins).toBe(20);

        vi.restoreAllMocks();
        stubRandom(0.5, 0, 0.5, 0.5, 0.0, 0.99);
        const available = await fetchUpstreamInfo(item(100));
        expect(available.available).toBe(true);
        expect(available.deliveryEstimateMins).toBe(45);
    });

    it("rejects when the provider fails", async () => {
        stubRandom(0.5, 0, 0.01); // failure check below 10%
        await expect(fetchUpstreamInfo(item(100))).rejects.toThrow(/unavailable/);
    });

    it("rejects when the provider is too slow", async () => {
        stubRandom(0.01); // slow check below 5% -> 3s latency, 2s timeout
        await expect(fetchUpstreamInfo(item(100))).rejects.toThrow(/timed out/);
    });
});
