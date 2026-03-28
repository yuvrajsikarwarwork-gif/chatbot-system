import { env } from "../config/env";

function getPublicApiBaseUrl() {
  return String(env.PUBLIC_API_BASE_URL || `http://localhost:${env.PORT || 4000}`).replace(/\/$/, "");
}

export function buildPublicFileUrl(fileName: string) {
  const normalizedName = String(fileName || "").replace(/^\/+/, "");
  return `${getPublicApiBaseUrl()}/uploads/${normalizedName}`;
}

export function normalizePublicMediaUrl(input: string) {
  const raw = String(input || "").trim();
  if (!raw) {
    return "";
  }

  const publicBaseUrl = getPublicApiBaseUrl();

  if (/^\/uploads\//i.test(raw)) {
    return `${publicBaseUrl}${raw}`;
  }

  if (/^uploads\//i.test(raw)) {
    return `${publicBaseUrl}/${raw}`;
  }

  try {
    const parsed = new URL(raw);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0";

    if (isLocalHost && /^\/uploads\//i.test(parsed.pathname)) {
      return `${publicBaseUrl}${parsed.pathname}${parsed.search}`;
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}
