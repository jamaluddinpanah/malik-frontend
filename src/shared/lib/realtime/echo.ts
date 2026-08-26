"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { clientLocale } from "@/shared/i18n/config";
import { env } from "@/shared/lib/env";

let echo: Echo<"reverb"> | null = null;

function csrfToken(): string | undefined {
  return document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length);
}

export function realtime(): Echo<"reverb"> | null {
  if (typeof window === "undefined" || !env.reverbKey) return null;
  if (!echo) {
    echo = new Echo({
      broadcaster: "reverb",
      key: env.reverbKey,
      Pusher,
      wsHost: env.reverbHost,
      wsPort: env.reverbPort,
      wssPort: env.reverbPort,
      forceTLS: env.reverbScheme === "https",
      enabledTransports: ["ws", "wss"],
      channelAuthorization: {
        customHandler: async ({ socketId, channelName }, callback) => {
          try {
            const response = await fetch(`${env.apiUrl}/api/broadcasting/auth`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": decodeURIComponent(csrfToken() ?? ""), "Accept": "application/json", "Accept-Language": clientLocale(), "X-Malik-Locale": clientLocale() },
              body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
            });
            if (!response.ok) throw new Error("Unable to authorize the realtime channel.");
            callback(null, await response.json());
          } catch (error) {
            callback(error instanceof Error ? error : new Error("Unable to authorize the realtime channel."), null);
          }
        },
      },
    });
  }
  return echo;
}

export function leaveRealtime(channel: string) {
  realtime()?.leave(channel);
}
