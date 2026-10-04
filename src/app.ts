import path from "path";
import express, { NextFunction, Request, Response } from "express";
import healthRoutes from "./routes/health";

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/api/health", healthRoutes);

app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});

export default app;
