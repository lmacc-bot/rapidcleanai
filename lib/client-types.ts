export type ClientSummary = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ClientCreateInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  proposalId?: string | null;
};

export type ClientCreateResponse = {
  client: ClientSummary;
  proposalAttached: boolean;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isClientSummary(value: unknown): value is ClientSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClientSummary>;

  return (
    typeof candidate.id === "string" &&
    isNullableString(candidate.name) &&
    isNullableString(candidate.phone) &&
    isNullableString(candidate.email) &&
    isNullableString(candidate.address) &&
    isNullableString(candidate.notes) &&
    typeof candidate.createdAt === "string" &&
    (candidate.updatedAt === undefined || isNullableString(candidate.updatedAt))
  );
}

export function isClientCreateResponse(value: unknown): value is ClientCreateResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ClientCreateResponse>;

  return isClientSummary(candidate.client) && typeof candidate.proposalAttached === "boolean";
}
