import catalogData from "../data/catalog.json";
import { CatalogItem } from "../models/catalogItem";

const catalog: CatalogItem[] = catalogData;

export function getCatalog(): CatalogItem[] {
    return catalog;
}

export function getCategories(): string[] {
    return [... new Set(catalog.map((item) => item.category))].sort();
}