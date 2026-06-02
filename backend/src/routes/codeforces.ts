import { Router } from "express";
import { z } from "zod";
import { fetchGymStandings } from "../utils/codeforces.js";
import { authenticate } from "../middleware/auth.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

const router = Router();

const gymSchema = z.object({
  gymId: z.string().min(1, "Gym ID is required"),
});

router.post("/gym-standings", authenticate, async (req, res) => {
  try {
    const { gymId } = gymSchema.parse(req.body);
    const apiKey = process.env.CODEFORCES_API_KEY;
    const apiSecret = process.env.CODEFORCES_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: "Codeforces API keys are not configured on the server." });
    }

    // Cache by gymId to prevent rate limits on refreshes
    const cacheKey = `cf_gym_${gymId}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const data = await fetchGymStandings(gymId, apiKey, apiSecret);
    
    // Cache for 60 seconds to avoid spamming Codeforces API
    cacheSet(cacheKey, data, 60000);

    return res.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    const err = e as Error;
    console.error(err);
    return res.status(500).json({ error: err.message || "Failed to fetch gym standings" });
  }
});

export default router;
