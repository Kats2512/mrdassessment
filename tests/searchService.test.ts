import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { search } from "../src/services/searchService";
import { SearchParams } from "../src/models/search";

const base: SearchParams = { sort: "popularity", page: 1, pageSize: 50 };

describe("searchService", () => {
    // 0.5 means: not slow, not failing, no price shift, so results are predictable
    beforeEach(() => {
        vi.spyOn(Math, "random").mockReturnValue(0.5);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("matches on name", async () => {
        const result = await search({ ...base, q: "pepperoni" });
        expect(result.items.map((i) => i.name)).toEqual(["Beef Pepperoni Pizza"]);
    });

    it("matches on restaurant and ignores case", async () => {
        const result = await search({ ...base, q: "FLAME grill" });
        expect(result.total).toBeGreaterThan(0);
        expect(result.items.every((i) => i.restaurant === "Flame Grill")).toBe(true);
    });

    it("requires every search word to match", async () => {
        const result = await search({ ...base, q: "chicken pizza" });
        expect(result.items.map((i) => i.name)).toEqual(["BBQ Chicken Pizza"]);
    });

    it("returns nothing when there is no match", async () => {
        const result = await search({ ...base, q: "zzzz" });
        expect(result).toMatchObject({ total: 0, totalPages: 0, items: [] });
    });

    it("filters by category", async () => {
        const result = await search({ ...base, category: "pizza" });
        expect(result.total).toBe(5);
        expect(result.items.every((i) => i.category === "Pizza")).toBe(true);
    });

    it("combines query and category", async () => {
        const result = await search({ ...base, q: "chicken", category: "Burgers" });
        expect(result.items.map((i) => i.name)).toEqual(["Chicken Burger"]);
    });

    it("sorts by price ascending and descending", async () => {
        const asc = (await search({ ...base, sort: "price_asc" })).items.map((i) => i.basePrice);
        const desc = (await search({ ...base, sort: "price_desc" })).items.map((i) => i.basePrice);

        expect(asc).toEqual([...asc].sort((a, b) => a - b));
        expect(desc).toEqual([...desc].sort((a, b) => b - a));
    });

    it("sorts by popularity and by name", async () => {
        const popularity = (await search({ ...base, sort: "popularity" })).items.map((i) => i.popularity);
        const names = (await search({ ...base, sort: "name" })).items.map((i) => i.name);

        expect(popularity).toEqual([...popularity].sort((a, b) => b - a));
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it("paginates and reports totals", async () => {
        const first = await search({ ...base, pageSize: 10, page: 1 });
        const last = await search({ ...base, pageSize: 10, page: 4 });
        const beyond = await search({ ...base, pageSize: 10, page: 5 });

        expect(first.items).toHaveLength(10);
        expect(first.total).toBe(38);
        expect(first.totalPages).toBe(4);
        expect(last.items).toHaveLength(8);
        expect(beyond.items).toHaveLength(0);
    });

    it("does not repeat items across pages", async () => {
        const one = await search({ ...base, pageSize: 20, page: 1 });
        const two = await search({ ...base, pageSize: 20, page: 2 });
        const ids = [...one.items, ...two.items].map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("adds upstream info to each item", async () => {
        const [item] = (await search({ ...base, q: "pepperoni" })).items;
        expect(item.upstream?.price).toBe(item.basePrice);
        expect(item.upstream?.available).toBe(true);
        expect(item.upstreamError).toBeUndefined();
    });
});

describe("searchService when upstream fails", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("still returns the item, with upstream null and an error", async () => {
        // 0.01 makes the simulated call slow, so it hits the 2s timeout
        vi.spyOn(Math, "random").mockReturnValue(0.01);
        const result = await search({ ...base, q: "pepperoni" });

        expect(result.total).toBe(1);
        expect(result.items[0].upstream).toBeNull();
        expect(result.items[0].upstreamError).toMatch(/timed out/);
    });
});
