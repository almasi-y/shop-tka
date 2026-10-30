"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CustomerNotification = {
  key: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
  read: boolean;
};

type NotificationResponse = {
  notifications?: CustomerNotification[];
  unreadCount?: number;
  error?: string;
};

const notificationTimeFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatNotificationTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : notificationTimeFormatter.format(date);
}

export function NotificationCenter() {
  const { isLoaded, isSignedIn } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = (await response.json()) as NotificationResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to load notifications");
      }
      setNotifications(result.notifications ?? []);
      setError(null);
    } catch (requestError) {
      console.error("Notification request failed", requestError);
      setError("Unable to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const initialLoadId = window.setTimeout(() => {
      void refreshNotifications();
    }, 0);
    const intervalId = window.setInterval(refreshNotifications, 60_000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [isLoaded, isSignedIn, refreshNotifications]);

  const markAsRead = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    const keySet = new Set(keys);
    setNotifications((current) =>
      current.map((notification) =>
        keySet.has(notification.key)
          ? { ...notification, read: true }
          : notification,
      ),
    );

    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) void refreshNotifications();
    }).catch(() => {
      void refreshNotifications();
    });
  }, [refreshNotifications]);

  const unreadNotifications = notifications.filter(
    (notification) => !notification.read,
  );
  const unreadCount = unreadNotifications.length;

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (open) void refreshNotifications();
      }}
    >
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
        className="relative inline-flex size-8 items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-blue px-1 text-[0.625rem] font-bold leading-none text-white shadow-md ring-2 ring-white dark:ring-zinc-950"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(23rem,calc(100vw-2rem))] p-0"
      >
        <DropdownMenuGroup>
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  markAsRead(
                    unreadNotifications.map((notification) => notification.key),
                  )
                }
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-1">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading updates…
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet. Order and account updates will appear here.
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.key}
                  render={<Link href={notification.href} />}
                  onClick={() => markAsRead([notification.key])}
                  className="items-start gap-3 px-3 py-3"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.read ? "bg-zinc-300" : "bg-brand-blue"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[0.7rem] text-muted-foreground/80">
                      {formatNotificationTime(notification.occurredAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          render={<Link href="/orders" />}
          className="justify-center rounded-none px-4 py-2.5 text-xs font-medium text-brand-blue"
        >
          View all order updates
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
