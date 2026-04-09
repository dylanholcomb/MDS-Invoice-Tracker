import { Router, type IRouter } from "express";
import { ilike, or } from "drizzle-orm";
import { db } from "../lib/db";
import { speedchartsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/speedcharts", async (req, res) => {
  const { search, limit = "100" } = req.query as Record<string, string>;
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10)));

  const where = search
    ? or(
        ilike(speedchartsTable.speedchart, `%${search}%`),
        ilike(speedchartsTable.description, `%${search}%`)
      )
    : undefined;

  const results = await db
    .select()
    .from(speedchartsTable)
    .where(where)
    .limit(limitNum)
    .orderBy(speedchartsTable.speedchart);

  res.json(results.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

export default router;
