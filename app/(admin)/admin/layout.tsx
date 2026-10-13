import { ClerkProvider, SignIn, SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const emailAddresses = user?.emailAddresses.map(
    ({ emailAddress }) => emailAddress,
  );

  return (
    <ClerkProvider>
      {!user ? (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
          <div className="flex w-full max-w-md flex-col items-center gap-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                A
              </div>
              <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                Admin sign in
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Sign in with an approved administrator account.
              </p>
            </div>
            <SignIn
              routing="hash"
              forceRedirectUrl="/admin"
              signUpForceRedirectUrl="/admin"
            />
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Return to shop
            </Link>
          </div>
        </main>
      ) : isAdminEmail(emailAddresses ?? []) ? (
        <AdminShell>{children}</AdminShell>
      ) : (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
          <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Your signed-in account is not on the administrator allowlist.
            </p>
            <p className="mt-3 break-all text-sm font-medium">
              {user.primaryEmailAddress?.emailAddress ?? emailAddresses?.[0]}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <SignOutButton redirectUrl="/admin">
                <Button>Sign in with another account</Button>
              </SignOutButton>
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Return to shop
              </Link>
            </div>
          </section>
        </main>
      )}
    </ClerkProvider>
  );
}

export default AdminLayout;
