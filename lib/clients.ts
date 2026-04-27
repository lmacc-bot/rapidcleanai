import "server-only";

import type { ClientSummary } from "@/lib/client-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ClientRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapClientRow(row: ClientRow): ClientSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at,
  };
}

export async function getLatestClients(userId: string, limit = 5): Promise<ClientSummary[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, phone, email, address, notes, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    console.error("[clients] Failed to load latest clients", error.message);
    return [];
  }

  return ((data ?? []) as ClientRow[]).map(mapClientRow);
}
