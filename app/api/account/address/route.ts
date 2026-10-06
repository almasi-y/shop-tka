import { auth, currentUser } from "@clerk/nextjs/server";
import { shippingAddressSchema } from "@/lib/checkout/shipping-address";
import { CUSTOMER_ADDRESS_BY_USER_QUERY } from "@/lib/sanity/queries/customers";
import { writeClient } from "@/sanity/lib/client";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return privateJson({ error: "Authentication required" }, { status: 401 });
    }

    if (!process.env.SANITY_API_WRITE_TOKEN) {
      return privateJson(
        { error: "Address storage is not configured" },
        { status: 503 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return privateJson({ error: "Invalid request" }, { status: 400 });
    }

    const parsedAddress = shippingAddressSchema.safeParse(body);
    if (!parsedAddress.success) {
      return privateJson(
        { error: "Please enter a complete shipping address" },
        { status: 400 },
      );
    }

    const existingCustomer = await writeClient.fetch(
      CUSTOMER_ADDRESS_BY_USER_QUERY,
      { clerkUserId: userId },
    );

    if (existingCustomer?._id) {
      await writeClient
        .patch(existingCustomer._id)
        .set({ shippingAddress: parsedAddress.data })
        .commit();
    } else {
      const user = await currentUser();
      const primaryEmail = user?.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId,
      );
      const email =
        primaryEmail?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

      if (!email) {
        return privateJson(
          { error: "Your account does not have an email address" },
          { status: 400 },
        );
      }

      const fullName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      await writeClient.create({
        _type: "customer",
        clerkUserId: userId,
        email,
        name: fullName || parsedAddress.data.name,
        shippingAddress: parsedAddress.data,
        createdAt: new Date().toISOString(),
      });
    }

    return privateJson({ address: parsedAddress.data });
  } catch (error) {
    console.error("Customer address update failed", error);
    return privateJson({ error: "Unable to save your address" }, { status: 500 });
  }
}
