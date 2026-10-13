const [command, reference] = process.argv.slice(2);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
const secret = process.env.PAYMENT_OPERATIONS_SECRET;

if (!baseUrl || !secret) {
  console.error(
    "NEXT_PUBLIC_BASE_URL and PAYMENT_OPERATIONS_SECRET are required.",
  );
  process.exitCode = 1;
} else if (command === "readiness") {
  const response = await fetch(`${baseUrl}/api/internal/payments/readiness`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  console.log(JSON.stringify(await response.json(), null, 2));
  if (!response.ok) process.exitCode = 1;
} else if (command === "reconcile") {
  if (!reference?.startsWith("order-")) {
    console.error("Provide the Paystack order reference to reconcile.");
    process.exitCode = 1;
  } else {
    const response = await fetch(
      `${baseUrl}/api/internal/payments/reconcile`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference }),
      },
    );
    console.log(JSON.stringify(await response.json(), null, 2));
    if (!response.ok) process.exitCode = 1;
  }
} else {
  console.error("Use either: readiness | reconcile <order-reference>");
  process.exitCode = 1;
}
