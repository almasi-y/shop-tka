import "server-only";

import { client } from "./client";
import { sanityReadToken } from "./token";

export const serverReadClient = client.withConfig({
  token: sanityReadToken,
  useCdn: false,
  perspective: "published",
});
