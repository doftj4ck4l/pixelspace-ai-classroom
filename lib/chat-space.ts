"use client";

/**
 * The space a chat is currently grounded in — set from `?space=<id>` on
 * /chat and read by the transport when a message is sent, so every turn of
 * the conversation carries the space id to the relay.
 */
export const chatSpace: { id?: string } = {};
