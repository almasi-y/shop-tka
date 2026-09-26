"use client";

import { useIsChatOpen } from "@/lib/store/chat-store-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isChatOpen = useIsChatOpen();

  return (
    <div
      className={`relative flex min-h-svh flex-col bg-zinc-50 transition-all dark:bg-zinc-900 duration-300 ease-in-out ${
        isChatOpen ? "xl:mr-[448px] max-xl:overflow-hidden max-xl:h-screen" : ""
      }`}
    >
      {children}
    </div>
  );
}