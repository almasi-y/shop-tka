import {
  fulfillPaystackTransaction,
  PaystackFulfillmentError,
} from "@/lib/checkout/fulfill-paystack-transaction";
import {
  PaystackApiError,
  verifyPaystackTransaction,
} from "@/lib/payments/paystack";

export class PaymentReconciliationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PaymentReconciliationError";
  }
}

export async function reconcilePaystackReference(
  reference: string,
  expectedClerkUserId?: string,
) {
  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.status !== "success") {
      throw new PaymentReconciliationError(
        "Payment has not succeeded",
        "PAYSTACK_TRANSACTION_NOT_SUCCESSFUL",
        409,
      );
    }

    return await fulfillPaystackTransaction(
      transaction,
      expectedClerkUserId,
    );
  } catch (error) {
    if (error instanceof PaymentReconciliationError) throw error;
    if (error instanceof PaystackFulfillmentError) {
      throw new PaymentReconciliationError(
        error.message,
        error.code,
        error.status,
        { cause: error },
      );
    }
    if (error instanceof PaystackApiError) {
      throw new PaymentReconciliationError(
        error.message,
        error.code,
        error.status,
        { cause: error },
      );
    }
    throw new PaymentReconciliationError(
      "Unable to reconcile payment",
      "PAYMENT_RECONCILIATION_FAILED",
      502,
      { cause: error },
    );
  }
}
