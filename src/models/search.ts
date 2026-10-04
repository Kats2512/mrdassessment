import { CatalogItem } from "./catalogItem";
import { UpstreamInfo } from "./upstream";

export const SORT_OPTIONS = [
    "popularity",
    "price_asc",
    "price_desc",
    "name"
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export interface SearchParams {
    q?: string;
    category?: string;
    sort: SortOption
    page: number;
    pageSize: number;
}

export interface EnrichedItem extends CatalogItem {
    upstream: UpstreamInfo | null;
    upstreamError?: string;
}

export interface SearchResponse {
    items: EnrichedItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}