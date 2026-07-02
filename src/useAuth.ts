import { useEffect, useState } from "react";
import type { ClientPrincipal } from "./LoginPrompt";

/**
 * Reads the signed-in user from Azure Static Web Apps' built-in auth
 * endpoint. Resolves to null when anonymous or when running locally
 * without the SWA emulator.
 */
export const useAuth = () => {
  const [clientPrincipal, setClientPrincipal] = useState<ClientPrincipal | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadClientPrincipal = async () => {
      try {
        const response = await fetch("/.auth/me");
        if (!response.ok) {
          return;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return;
        }

        const data = (await response.json()) as { clientPrincipal?: ClientPrincipal | null };
        if (isMounted && data.clientPrincipal) {
          setClientPrincipal(data.clientPrincipal);
        }
      } catch {
        // Ignore auth lookup failures in local/dev environments.
      } finally {
        // Signals that the auth lookup finished (signed in or not), so UI
        // that depends on auth state can avoid flashing the wrong variant.
        if (isMounted) {
          setAuthChecked(true);
        }
      }
    };

    loadClientPrincipal();

    return () => {
      isMounted = false;
    };
  }, []);

  return { clientPrincipal, isAuthenticated: clientPrincipal !== null, authChecked };
};
