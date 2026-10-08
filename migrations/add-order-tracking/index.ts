import { at, defineMigration, setIfMissing } from "sanity/migrate";
import {
  createTrackingEventKey,
  createTrackingNumber,
} from "../../lib/orders/tracking";

type LegacyOrderStatus = "paid" | "shipped" | "delivered" | "cancelled";

function fulfillmentStatusFor(status: unknown) {
  const legacyStatus = status as LegacyOrderStatus;

  if (legacyStatus === "shipped") return "dispatched";
  if (legacyStatus === "delivered") return "delivered";
  if (legacyStatus === "cancelled") return "cancelled";
  return "processing";
}

export default defineMigration({
  title: "Add tracking data to existing orders",
  documentTypes: ["order"],
  filter:
    "!defined(trackingNumber) || !defined(paymentStatus) || !defined(fulfillmentStatus) || !defined(trackingEvents)",
  migrate: {
    document(document) {
      const createdAt =
        typeof document.createdAt === "string"
          ? document.createdAt
          : document._createdAt;
      const sourceReference =
        typeof document.paystackReference === "string"
          ? document.paystackReference
          : document._id;
      const fulfillmentStatus = fulfillmentStatusFor(document.status);
      const events = [
        {
          _key: createTrackingEventKey(
            sourceReference,
            "payment_confirmed",
            createdAt,
          ),
          _type: "trackingEvent",
          status: "payment_confirmed",
          occurredAt: createdAt,
          publicMessage: "Payment confirmed and order received.",
          source: "system",
        },
        {
          _key: createTrackingEventKey(
            sourceReference,
            "processing",
            createdAt,
          ),
          _type: "trackingEvent",
          status: "processing",
          occurredAt: createdAt,
          publicMessage: "Your order is being prepared.",
          source: "system",
        },
      ];

      if (
        (fulfillmentStatus === "dispatched" ||
          fulfillmentStatus === "delivered") &&
        typeof document.shippedAt === "string"
      ) {
        events.push({
          _key: createTrackingEventKey(
            sourceReference,
            "dispatched",
            document.shippedAt,
          ),
          _type: "trackingEvent",
          status: "dispatched",
          occurredAt: document.shippedAt,
          publicMessage: "Your order has been dispatched.",
          source: "system",
        });
      }

      if (
        fulfillmentStatus === "delivered" &&
        typeof document.deliveredAt === "string"
      ) {
        events.push({
          _key: createTrackingEventKey(
            sourceReference,
            "delivered",
            document.deliveredAt,
          ),
          _type: "trackingEvent",
          status: "delivered",
          occurredAt: document.deliveredAt,
          publicMessage: "Your order has been delivered.",
          source: "system",
        });
      }

      if (fulfillmentStatus === "cancelled") {
        const cancelledAt =
          typeof document.cancelledAt === "string"
            ? document.cancelledAt
            : document._updatedAt;
        events.push({
          _key: createTrackingEventKey(
            sourceReference,
            "cancelled",
            cancelledAt,
          ),
          _type: "trackingEvent",
          status: "cancelled",
          occurredAt: cancelledAt,
          publicMessage: "This order was cancelled.",
          source: "system",
        });
      }

      return [
        at(
          "trackingNumber",
          setIfMissing(createTrackingNumber(sourceReference, createdAt)),
        ),
        at("paymentStatus", setIfMissing("paid")),
        at("fulfillmentStatus", setIfMissing(fulfillmentStatus)),
        at("trackingEvents", setIfMissing(events)),
      ];
    },
  },
});
