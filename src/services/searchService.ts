import { CatalogItem } from "../models/catalogItem";
import { EnrichedItem, SearchParams, SearchResponse, SortOption } from "../models/search";
import { getCatalog } from './catalogService';
import { fetchUpstreamInfo } from "./upstreamService";

const sorters: Record<SortOption, (a: CatalogItem, b: CatalogItem) => number> = {
    popularity: (a, b) => b.popularity - a.popularity,
    price_asc: (a, b) => a.basePrice - b.basePrice,
    price_desc: (a, b) => b.basePrice - a.basePrice,
    name: (a, b) => a.name.localeCompare(b.name),
};

function filterAndSort({ q, category, sort }: SearchParams): CatalogItem[] {
    const terms = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);

    return getCatalog()
        .filter((item) => !category || item.category.toLowerCase() === category.toLowerCase())
        .filter((item) => {
            const itemName = `${item.name} ${item.restaurant} ${item.category}`.toLowerCase();
            return terms.every((term) => itemName.includes(term));
        }).sort(sorters[sort]);
}

async function enrich(item: CatalogItem): Promise<EnrichedItem> {
    try {
        return { ...item, upstream: await fetchUpstreamInfo(item) };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown upstream error";
        return { ...item, upstream: null, upstreamError: message };
    }
}

export async function search(params: SearchParams): Promise<SearchResponse> {
    const matches = filterAndSort(params);
    const start = (params.page - 1) * params.pageSize;

    const pageItems = matches.slice(start, start + params.pageSize);
    const items = await Promise.all(pageItems.map(enrich));

    return {
        items,
        page: params.page,
        pageSize: params.pageSize,
        total: matches.length,
        totalPages: Math.ceil(matches.length / params.pageSize)
    }
}