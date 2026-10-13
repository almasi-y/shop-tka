import "server-only";

function getAdminEmailAllowlist() {
  return new Set(
    (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
      .split(/[;,\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(emailAddresses: string[]) {
  const allowlist = getAdminEmailAllowlist();

  return emailAddresses.some((email) =>
    allowlist.has(email.trim().toLowerCase()),
  );
}
