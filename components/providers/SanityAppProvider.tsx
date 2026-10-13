"use client";

import { SanityApp } from "@sanity/sdk-react";
import { dataset, projectId } from "@/sanity/env";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";

function SanityAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SanityApp
      config={[
        {
          projectId,
          dataset,
          // The custom admin is hosted as part of the same web app rather than
          // inside Sanity Dashboard. Studio mode uses the user's existing
          // Sanity session and prevents the App SDK from redirecting production
          // top-level pages to sanity.io/welcome.
          studio: {},
        },
      ]}
      fallback={
        <LoadingSpinner
          text="Connecting to Sanity..."
          isFullScreen
          size="lg"
        />
      }
    >
      {children}
    </SanityApp>
  );
}

export default SanityAppProvider;
