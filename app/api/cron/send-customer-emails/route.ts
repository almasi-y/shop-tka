import { retryRecentCustomerEmails } from "@/lib/email/customer-notifications";
import { isVercelCron } from "@/lib/payments/operations-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isVercelCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await retryRecentCustomerEmails();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled customer email retry failed", error);
    return Response.json(
      { error: "Scheduled customer email retry failed" },
      { status: 500 },
    );
  }
}
