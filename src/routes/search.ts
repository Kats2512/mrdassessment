import { Router } from "express";
import { getCategories } from "../services/catalogService";

const router = Router();

router.get("/categories", (req, res) => {
    res.json({ categories: getCategories() })
})

export default router;