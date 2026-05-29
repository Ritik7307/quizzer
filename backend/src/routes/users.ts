import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { verifyToken } from "../utils/jwt.js";

const router = Router();

// Get list of followed users (friends)
router.get("/me/friends", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const friends = await prisma.follows.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            points: true,
            streak: true,
            lastActiveAt: true
          }
        }
      }
    });
    
    res.json({ friends: friends.map(f => f.following) });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ error: "Failed to fetch friends list" });
  }
});

// Get public profile
router.get("/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        points: true,
        streak: true,
        leetcodeHandle: true,
        codeforcesHandle: true,
        lastActiveAt: true,
        createdAt: true,
        userBadges: {
          include: { badge: true }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            codingSubmissions: {
              where: { status: "Accepted" }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the current logged-in user follows them
    let isFollowing = false;
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") 
      ? header.slice(7) 
      : (req.cookies?.token || (req.query.token as string));
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded) {
          const follow = await prisma.follows.findUnique({
            where: {
              followerId_followingId: {
                followerId: decoded.userId,
                followingId: id
              }
            }
          });
          if (follow) {
            isFollowing = true;
          }
        }
      } catch (e) {
        // ignore invalid token errors in public profiles
      }
    }

    res.json({ ...user, isFollowing });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Follow a user
router.post("/:id/follow", authenticate, async (req: AuthRequest, res) => {
  try {
    const followerId = req.user!.userId;
    const followingId = String(req.params.id);

    if (followerId === followingId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.follows.create({
      data: {
        followerId,
        followingId
      }
    });

    res.json({ success: true, message: "User followed successfully" });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: "Already following this user" });
    }
    console.error("Follow error:", error);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// Unfollow a user
router.delete("/:id/follow", authenticate, async (req: AuthRequest, res) => {
  try {
    const followerId = req.user!.userId;
    const followingId = String(req.params.id);

    await prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.json({ success: true, message: "User unfollowed successfully" });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(400).json({ error: "Not following this user" });
    }
    console.error("Unfollow error:", error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

export default router;
