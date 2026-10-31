import { after } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  sendOrderTrackingEmail,
  sendRestockEmails,
  sendReturnStatusEmail,
} from "@/lib/email/customer-notifications";

const requestSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("order_tracking"),
    documentId: z.string().trim().min(1).max(300),
    eventKey: z.string().trim().min(1).max(300),
  }),
  z.object({
    eventType: z.literal("return_status"),
    documentId: z.string().trim().min(1).max(300),
  }),
  z.object({
    eventType: z.literal("restock"),
    documentId: z.string().trim().min(1).max(300),
  }),
]);

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  if (
    !isAdminEmail(
      user.emailAddresses.map(({ emailAddress }) => emailAddress),
    )
  ) {
    return Response.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? (error.issues[0]?.message ?? "Invalid email event")
            : "Invalid request",
      },
      { status: 400 },
    );
  }

  after(async () => {
    try {
      if (input.eventType === "order_tracking") {
        await sendOrderTrackingEmail(input.documentId, input.eventKey);
      } else if (input.eventType === "return_status") {
        await sendReturnStatusEmail(input.documentId);
      } else {
        await sendRestockEmails(input.documentId);
      }
    } catch (error) {
      console.error("Queued customer email failed", {
        eventType: input.eventType,
        documentId: input.documentId,
        error,
      });
    }
  });

  return Response.json({ queued: true }, { status: 202 });
}
