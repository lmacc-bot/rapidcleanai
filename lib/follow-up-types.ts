export type FollowUpSummary = {
  id: string;
  clientId: string | null;
  proposalId: string | null;
  clientName: string | null;
  clientContact: string | null;
  dueAt: string;
  note: string | null;
  proposalTotal: number | null;
  status: "pending" | "done";
};

export type FollowUpCreateResponse = {
  followUp: FollowUpSummary;
};

export type FollowUpCompleteResponse = {
  id: string;
  status: "done";
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function isFollowUpSummary(value: unknown): value is FollowUpSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FollowUpSummary>;

  return (
    typeof candidate.id === "string" &&
    isNullableString(candidate.clientId) &&
    isNullableString(candidate.proposalId) &&
    isNullableString(candidate.clientName) &&
    isNullableString(candidate.clientContact) &&
    typeof candidate.dueAt === "string" &&
    isNullableString(candidate.note) &&
    isNullableNumber(candidate.proposalTotal) &&
    (candidate.status === "pending" || candidate.status === "done")
  );
}

export function isFollowUpCreateResponse(value: unknown): value is FollowUpCreateResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FollowUpCreateResponse>;
  return isFollowUpSummary(candidate.followUp);
}

export function isFollowUpCompleteResponse(value: unknown): value is FollowUpCompleteResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FollowUpCompleteResponse>;
  return typeof candidate.id === "string" && candidate.status === "done";
}
