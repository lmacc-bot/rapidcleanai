import "server-only";

import type { FollowUpSummary } from "@/lib/follow-up-types";
import { isProposalPayload } from "@/lib/proposal-types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type FollowUpRow = {
  id: string;
  client_id: string | null;
  proposal_id: string | null;
  status: string;
  due_at: string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type ProposalRow = {
  id: string;
  payload: unknown;
};

function mapFollowUpRow(
  row: FollowUpRow,
  clientsById: Map<string, ClientRow>,
  proposalTotalsById: Map<string, number>,
): FollowUpSummary {
  const client = row.client_id ? clientsById.get(row.client_id) ?? null : null;
  const clientName = client?.name || client?.address || client?.email || client?.phone || null;
  const clientContact = client?.phone || client?.email || null;

  return {
    id: row.id,
    clientId: row.client_id,
    proposalId: row.proposal_id,
    clientName,
    clientContact,
    dueAt: row.due_at,
    note: row.note,
    proposalTotal: row.proposal_id ? proposalTotalsById.get(row.proposal_id) ?? null : null,
    status: row.status === "done" ? "done" : "pending",
  };
}

export async function getPendingFollowUps(userId: string, limit = 8): Promise<FollowUpSummary[]> {
  const supabase = createAdminSupabaseClient();
  const { data: followUps, error } = await supabase
    .from("follow_ups")
    .select("id, client_id, proposal_id, status, due_at, note, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("due_at", {
      ascending: true,
    })
    .limit(limit);

  if (error) {
    console.error("[follow-ups] Failed to load pending follow-ups", error.message);
    return [];
  }

  const rows = (followUps ?? []) as FollowUpRow[];
  const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))] as string[];
  const proposalIds = [...new Set(rows.map((row) => row.proposal_id).filter(Boolean))] as string[];
  const clientsById = new Map<string, ClientRow>();
  const proposalTotalsById = new Map<string, number>();

  if (clientIds.length) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, phone, email, address")
      .eq("user_id", userId)
      .in("id", clientIds);

    if (clientsError) {
      console.error("[follow-ups] Failed to load follow-up clients", clientsError.message);
    } else {
      ((clients ?? []) as ClientRow[]).forEach((client) => {
        clientsById.set(client.id, client);
      });
    }
  }

  if (proposalIds.length) {
    const { data: proposals, error: proposalsError } = await supabase
      .from("proposals")
      .select("id, payload")
      .eq("user_id", userId)
      .in("id", proposalIds);

    if (proposalsError) {
      console.error("[follow-ups] Failed to load follow-up proposals", proposalsError.message);
    } else {
      ((proposals ?? []) as ProposalRow[]).forEach((proposal) => {
        if (isProposalPayload(proposal.payload)) {
          proposalTotalsById.set(proposal.id, proposal.payload.total_price);
        }
      });
    }
  }

  return rows.map((row) => mapFollowUpRow(row, clientsById, proposalTotalsById));
}
