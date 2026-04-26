export type ProposalLineItem = {
  label: string;
  price: number;
  description?: string;
};

export type ProposalPayload = {
  proposal_id: string;
  subject: string;
  message_text: string;
  line_items: ProposalLineItem[];
  total_price: number;
  estimated_hours: number | null;
  terms: string[];
  upsells: ProposalLineItem[];
};

export function isProposalPayload(value: unknown): value is ProposalPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ProposalPayload>;
  const validLineItems = (items: unknown) =>
    Array.isArray(items) &&
    items.every((item) => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const lineItem = item as Partial<ProposalLineItem>;
      return (
        typeof lineItem.label === "string" &&
        typeof lineItem.price === "number" &&
        Number.isFinite(lineItem.price) &&
        (lineItem.description === undefined || typeof lineItem.description === "string")
      );
    });

  return (
    typeof candidate.proposal_id === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.message_text === "string" &&
    validLineItems(candidate.line_items) &&
    typeof candidate.total_price === "number" &&
    Number.isFinite(candidate.total_price) &&
    (candidate.estimated_hours === null ||
      (typeof candidate.estimated_hours === "number" && Number.isFinite(candidate.estimated_hours))) &&
    Array.isArray(candidate.terms) &&
    candidate.terms.every((term) => typeof term === "string") &&
    validLineItems(candidate.upsells)
  );
}
