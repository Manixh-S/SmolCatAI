import { HttpRequest } from "@azure/functions";

type ClientPrincipal = {
  userId?: string;
};

/**
 * Extracts the authenticated user ID from the `x-ms-client-principal` header.
 *
 * Azure Static Web Apps injects this header after validating the user's
 * session; it cannot be spoofed by clients when the app is hosted behind SWA.
 * Returns null for anonymous requests or malformed headers.
 */
export const getUserIdFromHeader = (request: HttpRequest): string | null => {
  const headerValue = request.headers.get("x-ms-client-principal");
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = Buffer.from(headerValue, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as ClientPrincipal;
    return parsed.userId ?? null;
  } catch {
    return null;
  }
};
