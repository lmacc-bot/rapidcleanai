import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const TRACKABLE_EVENT_NAMES = [
  "quote_generated",
  "proposal_created",
  "proposal_sent_whatsapp",
  "proposal_sent_sms",
  "proposal_sent_email",
  "follow_up_created",
  "upgrade_clicked",
  "subscription_started",
] as const;

export type TrackableEventName = (typeof TRACKABLE_EVENT_NAMES)[number];

export type EventMetadata =
  | Record<string, unknown>
  | null
  | undefined;

export function isTrackableEventName(value: unknown): value is TrackableEventName {
  return (
    typeof value === "string" &&
    TRACKABLE_EVENT_NAMES.includes(value as TrackableEventName)
  );
}

function normalizeMetadata(metadata: EventMetadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function insertEvent(
  eventName: TrackableEventName,
  metadata: EventMetadata,
  userId: string | null,
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("events").insert({
    user_id: userId,
    event_name: eventName,
    metadata: normalizeMetadata(metadata),
  });

  if (error) {
    console.warn("[events] Failed to track event", eventName, error.message);
  }
}

export function trackEvent(
  eventName: TrackableEventName,
  metadata: EventMetadata = {},
  userId: string | null = null,
) {
  void insertEvent(eventName, metadata, userId).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown event tracking error";
    console.warn("[events] Failed to track event", eventName, message);
  });
}
