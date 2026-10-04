import { Router } from "express";
import { SORT_OPTIONS, SortOption } from "../models/search";
import { getCategories } from "../services/catalogService";
import { search } from '../services/searchService';

const router = Router();

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

router.get("/", async (req, res, next) => {
    try {
        const { q, category } = req.query;
        const sort = (req.query.sort as string) ?? "popularity";
        const page = Number(req.query.page ?? 1);
        const pageSize = Number(req.query.pagesize ?? DEFAULT_PAGE_SIZE);

        if (!SORT_OPTIONS.includes(sort as SortOption)) {
            return res.status(400).json({ error: `Sort must be one of: ${SORT_OPTIONS.join(", ")}.` });
        }

        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({ error: "Page must be a positive number." });
        }

        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            return res.status(400).json({ error: `Page size must be between 1 and ${MAX_PAGE_SIZE}.` });
        }

        const result = await search({
            q: typeof q === "string" ? q : undefined,
            category: typeof category === "string" ? category : undefined,
            sort: sort as SortOption,
            page,
            pageSize,
        });

        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.get("/categories", (req, res) => {
    res.json({ categories: getCategories() })
});

export default router;