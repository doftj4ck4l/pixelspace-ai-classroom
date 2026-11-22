"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { chatSpace } from "@/lib/chat-space";

/** Binds `?space=<id>` on /chat to the chat transport (see lib/chat-space). */
export const ChatSpaceSync = () => {
  const params = useSearchParams();
  const space = params.get("space") ?? undefined;

  useEffect(() => {
    chatSpace.id = space;
    return () => {
      chatSpace.id = undefined;
    };
  }, [space]);

  return null;
};
