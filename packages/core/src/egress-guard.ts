import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { EgressBlocked } from "./errors";

/**
 * SSRF defense for tenant-supplied destinations (ERP HTTP endpoints, IMAP/SMTP
 * hosts). Rejects loopback / private / link-local / CGNAT / multicast / reserved
 * IPs, re-checks the RESOLVED ip (anti-rebinding) and returns the pinned ip so
 * the caller can connect to exactly what was validated.
 */

function ipv4Disallowed(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast 224/4 + reserved 240/4 + 255.255.255.255
  return false;
}

function ipv6Disallowed(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4.
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped?.[1]) return ipv4Disallowed(mapped[1]);
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 ULA
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb"))
    return true; // fe80::/10 link-local
  if (lower.startsWith("ff")) return true; // ff00::/8 multicast
  return false;
}

/** True if an IP literal is in a blocked range. */
export function isDisallowedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return ipv4Disallowed(ip);
  if (v === 6) return ipv6Disallowed(ip);
  return true; // not a valid IP → reject
}

export interface SafeTarget {
  host: string;
  /** The resolved, validated IP to connect to (pin this to prevent rebinding). */
  pinnedIp: string;
  family: 4 | 6;
}

/** Resolve `host`, reject any disallowed IP, and return the pinned address. */
export async function resolveSafeHost(host: string): Promise<SafeTarget> {
  if (!host || host.length > 253) throw EgressBlocked("Geçersiz host");
  // If host is already an IP literal, check directly.
  if (isIP(host)) {
    if (isDisallowedIp(host)) throw EgressBlocked(`Engellenen IP: ${host}`);
    return { host, pinnedIp: host, family: isIP(host) as 4 | 6 };
  }
  let addrs;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw EgressBlocked(`DNS çözümlenemedi: ${host}`);
  }
  if (addrs.length === 0) throw EgressBlocked(`DNS sonucu yok: ${host}`);
  for (const a of addrs) {
    if (isDisallowedIp(a.address)) {
      throw EgressBlocked(`Engellenen aralığa çözümlendi: ${host} -> ${a.address}`);
    }
  }
  const first = addrs[0]!;
  return { host, pinnedIp: first.address, family: first.family as 4 | 6 };
}

export interface HttpEgressOptions {
  /** Allow plain http (dev only). Default false → https required. */
  allowHttp?: boolean;
}

/** Validate an HTTP(S) URL for ERP-style outbound calls. Returns the pinned ip. */
export async function assertSafeHttpUrl(
  rawUrl: string,
  opts: HttpEgressOptions = {},
): Promise<SafeTarget> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw EgressBlocked("Geçersiz URL");
  }
  const allowed = opts.allowHttp ? ["http:", "https:"] : ["https:"];
  if (!allowed.includes(url.protocol)) {
    throw EgressBlocked(`İzin verilmeyen protokol: ${url.protocol}`);
  }
  return resolveSafeHost(url.hostname);
}
