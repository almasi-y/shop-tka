import { auth } from "@clerk/nextjs/server";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ReturnRequestForm,
  type ReturnFormItem,
} from "@/components/app/ReturnRequestForm";
import {
  getReturnReasonLabel,
  getReturnResolutionLabel,
  getReturnStatusLabel,
} from "@/lib/returns/constants";
import {
  normalizeReturnOrderItems,
  returnDeadline,
} from "@/lib/returns/normalize";
import {
  DELIVERED_ORDERS_FOR_RETURNS_QUERY,
  RETURNS_BY_USER_QUERY,
} from "@/lib/sanity/queries/returns";
import { serverReadClient } from "@/sanity/lib/server-client";

export const metadata = {
  title: "My Returns | Code Innovators Shop",
  description: "Request and track product returns",
};

const ACTIVE_STATUSES = new Set(["pending", "approved", "received", "completed"]);

export default async function ReturnsPage() {
  const { userId } = await auth.protect();
  const [orders, returns] = await Promise.all([
    serverReadClient.fetch(DELIVERED_ORDERS_FOR_RETURNS_QUERY, {
      clerkUserId: userId,
    }),
    serverReadClient.fetch(RETURNS_BY_USER_QUERY, { clerkUserId: userId }),
  ]);

  const requestedByOrderAndProduct = new Map<string, number>();
  for (const request of returns) {
    if (!ACTIVE_STATUSES.has(request.status ?? "pending") || !request.orderId) continue;
    for (const item of request.items ?? []) {
      if (!item.productId) continue;
      const key = `${request.orderId}:${item.productId}`;
      requestedByOrderAndProduct.set(
        key,
        (requestedByOrderAndProduct.get(key) ?? 0) + (item.quantity ?? 0),
      );
    }
  }

  const eligibleOrders = orders.flatMap((order) => {
    if (!order.deliveryDate) return [];
    const items: ReturnFormItem[] = normalizeReturnOrderItems(order).flatMap(
      (item) => {
        const alreadyRequested =
          requestedByOrderAndProduct.get(`${order._id}:${item.productId}`) ?? 0;
        const remainingQuantity = item.quantity - alreadyRequested;
        const deadline = returnDeadline(order.deliveryDate!, item.returnWindowDays);
        if (
          remainingQuantity < 1 ||
          item.returnEligibility === "non_returnable" ||
          new Date() > deadline
        ) {
          return [];
        }
        return [{
          productId: item.productId,
          productName: item.productName,
          remainingQuantity,
          returnEligibility: item.returnEligibility,
          returnWindowDays: item.returnWindowDays,
          deadline: deadline.toISOString(),
          policyNote: item.returnPolicyNote,
        }];
      },
    );
    return items.length > 0 ? [{ ...order, items }] : [];
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Returns</h1>
        <p className="mt-2 text-muted-foreground">
          Request a refund, exchange, or repair for eligible delivered items.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-brand-blue/20 bg-brand-mist/60 p-5 text-sm">
        <h2 className="font-semibold">Before you request a return</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Requests are reviewed by an admin and are not automatically refunded.</li>
          <li>Items must include their original packaging, accessories, manuals, and gifts.</li>
          <li>Return shipping is normally paid by the customer unless the item is defective or the error is ours.</li>
          <li>Approved refunds are sent to the original payment method and may take 5–10 business days after processing.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Need help? Call <a className="font-medium text-foreground underline" href="tel:+25480754126">+25480754126</a>.
        </p>
      </div>

      {eligibleOrders.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Eligible orders</h2>
          <div className="space-y-4">
            {eligibleOrders.map((order) => (
              <article key={order._id} className="rounded-xl border bg-card p-5">
                <div>
                  <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Delivered {new Date(order.deliveryDate!).toLocaleDateString("en-KE")}
                  </p>
                </div>
                <ReturnRequestForm orderId={order._id} items={order.items} />
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Request history</h2>
        {returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="No return requests"
            description={
              eligibleOrders.length > 0
                ? "Use an eligible order above to submit your first request."
                : "Eligible delivered items will appear here during their return window."
            }
          />
        ) : (
          <div className="space-y-4">
            {returns.map((request) => (
              <article key={request._id} className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{request.requestNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      Order #{request.orderNumber ?? "—"} · {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString("en-KE") : "Date unavailable"}
                    </p>
                  </div>
                  <Badge variant="secondary">{getReturnStatusLabel(request.status)}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  {getReturnResolutionLabel(request.resolution)} · {getReturnReasonLabel(request.reason)}
                </p>
                <ul className="mt-2 text-sm text-muted-foreground">
                  {(request.items ?? []).map((item) => (
                    <li key={item._key}>{item.quantity} × {item.productName}</li>
                  ))}
                </ul>
                {request.adminNotes && (
                  <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                    <span className="font-medium">Admin update:</span> {request.adminNotes}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
