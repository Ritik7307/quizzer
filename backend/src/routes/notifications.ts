import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole, type AuthRequest } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import { sendEmail as sendEmailUtil } from "../utils/email.js";

const router = Router();

// Retrieve notifications for the current authenticated user
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notifications });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to fetch notifications" });
  }
});

// Mark all notifications as read for the current user
router.patch("/read-all", authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    });
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// Mark a specific notification as read
router.patch("/:id/read", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user!.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json({ notification: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

const pushNotificationSchema = z.object({
  targetUserId: z.string(), // "all" for broadcast, or a specific userId
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  sendEmail: z.boolean().optional().default(false),
});

// Admin-only: Push notification to a user or all users
router.post("/admin/push", authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { targetUserId, title, message, sendEmail } = pushNotificationSchema.parse(req.body);

    if (targetUserId === "all") {
      // Broadcast to all users
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });

      if (users.length === 0) {
        return res.status(400).json({ error: "No users registered" });
      }

      // Create notifications in database
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title,
          message,
        })),
      });

      // Send emails asynchronously if toggled
      if (sendEmail) {
        users.forEach((u) => {
          sendEmailUtil({
            to: u.email,
            subject: title,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #6366f1;">New Announcement</h2>
                <p>Hi <strong>${u.name}</strong>,</p>
                <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <h3 style="margin-top: 0; color: #111827;">${title}</h3>
                  <p style="margin-bottom: 0; color: #4b5563;">${message}</p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                  This is an automated notification from Quizzer. Please log in to your dashboard to view all announcements.
                </p>
              </div>
            `,
          }).catch((err) => console.error(`Failed to send broadcast email to ${u.email}:`, err));
        });
      }

      return res.json({ success: true, message: `Notification broadcasted to ${users.length} users` });
    } else {
      // Target a specific user
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title,
          message,
        },
      });

      // Send email asynchronously if toggled
      if (sendEmail) {
        sendEmailUtil({
          to: user.email,
          subject: title,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #6366f1;">New Notification</h2>
              <p>Hi <strong>${user.name}</strong>,</p>
              <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                <h3 style="margin-top: 0; color: #111827;">${title}</h3>
                <p style="margin-bottom: 0; color: #4b5563;">${message}</p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                This is an automated notification from Quizzer. Please log in to your dashboard to view all announcements.
              </p>
            </div>
          `,
        }).catch((err) => console.error(`Failed to send notification email to ${user.email}:`, err));
      }

      return res.json({ success: true, message: `Notification sent to ${user.name}` });
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: e.errors[0]?.message ?? "Invalid input" });
    }
    console.error(e);
    return res.status(500).json({ error: "Failed to push notification" });
  }
});

export default router;
