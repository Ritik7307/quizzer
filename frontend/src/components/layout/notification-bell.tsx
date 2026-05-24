"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, Trash } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<{ notifications: NotificationItem[] }>("/api/notifications", { token });
      setNotifications(data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", getApiErrorMessage(err));
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();

      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api("/api/notifications/read-all", { method: "PATCH", token });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All marked as read");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleMarkRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH", token });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(); // Refresh on open
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white ring-2 ring-black">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] flex flex-col rounded-lg border border-neutral-800 bg-black/95 shadow-xl backdrop-blur-md z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <span className="text-sm font-semibold text-neutral-100">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-neutral-900">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="h-8 w-8 text-neutral-600 stroke-[1.5]" />
                <p className="mt-2 text-sm text-neutral-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkRead(item.id, item.read)}
                  className={`flex flex-col gap-1 p-4 transition-colors cursor-pointer text-left ${
                    item.read ? "bg-transparent hover:bg-neutral-900/50" : "bg-violet-600/5 hover:bg-violet-600/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm ${item.read ? "text-neutral-300" : "font-semibold text-neutral-100"}`}>
                      {item.title}
                    </span>
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                    {item.message}
                  </p>
                  <span className="text-[10px] text-neutral-500 mt-1">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
