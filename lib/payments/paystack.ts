import type { PaystackTransaction } from "@/lib/checkout/fulfill-paystack-transaction";

const PAYSTACK_API_URL = "https://api.paystack.co";

type PaystackResponse<T> = {
  status?: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    pageCount?: number;
  };
};

export class PaystackApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaystackApiError";
  }
}

function getSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new PaystackApiError(
      "Paystack is not configured",
      "PAYSTACK_SECRET_MISSING",
      500,
    );
  }
  return secret;
}

async function paystackRequest<T>(path: string) {
  const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getSecret()}` },
    cache: "no-store",
  });
  const result = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !result.status || result.data === undefined) {
    throw new PaystackApiError(
      result.message ?? "Paystack request failed",
      "PAYSTACK_API_REQUEST_FAILED",
      response.status || 502,
    );
  }

  return result;
}

export async function verifyPaystackTransaction(reference: string) {
  const result = await paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );

  if (result.data?.reference !== reference) {
    throw new PaystackApiError(
      "Paystack returned a different transaction reference",
      "PAYSTACK_REFERENCE_MISMATCH",
      502,
    );
  }

  return result.data;
}

export async function listSuccessfulPaystackTransactions(options: {
  from: string;
  to: string;
  page: number;
  perPage: number;
}) {
  const search = new URLSearchParams({
    status: "success",
    from: options.from,
    to: options.to,
    page: String(options.page),
    perPage: String(options.perPage),
  });
  const result = await paystackRequest<PaystackTransaction[]>(
    `/transaction?${search.toString()}`,
  );

  return {
    transactions: result.data ?? [],
    page: result.meta?.page ?? options.page,
    pageCount: result.meta?.pageCount ?? options.page,
  };
}
