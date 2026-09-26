import "server-only";

const readToken = process.env.SANITY_API_READ_TOKEN;

if (!readToken) {
  throw new Error("Missing SANITY_API_READ_TOKEN");
}

export const sanityReadToken = readToken;
