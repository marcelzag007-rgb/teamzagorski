import { createServerFn } from "@tanstack/react-start";

export type KomootActivity = {
  id: string;
  name: string;
  date: string;
  duration: string;
  distance: string;
  speed: string;
  ascent: string;
  descent: string;
};

export type KomootUser = {
  userId: string;
  name: string;
  profileUrl: string;
  items: KomootActivity[];
  error?: string;
};

export type ScanResult = {
  scannedAt: string;
  users: KomootUser[];
  foundTourIds: string[];
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")} h`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function parseProps(html: string): Record<string, unknown> | null {
  const match = html.match(/kmtBoot\.setProps\("(.*?)"\);/s);
  if (!match?.[1]) return null;
  try {
    const decoded = JSON.parse(`"${match[1]}"`) as string;
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function scanOne(userId: string, fallbackName: string): Promise<KomootUser> {
  const profileUrl = `https://www.komoot.com/pl-pl/user/${userId}`;
  const base: KomootUser = { userId, name: fallbackName, profileUrl, items: [] };
  try {
    const res = await fetch(profileUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "pl-PL,pl;q=0.9" },
    });
    if (!res.ok) return { ...base, error: `HTTP ${res.status}` };
    const props = parseProps(await res.text());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (props as any)?.user;
    if (!user) return { ...base, error: "Brak danych profilu" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = user?._embedded?.activities?._embedded?.items ?? [];
    const items: KomootActivity[] = raw
      .filter((a) => a?.type === "TOUR_RECORDED" && a?._embedded?.tour)
      .map((a) => {
        const t = a._embedded.tour;
        const km = (t.distance ?? 0) / 1000;
        const hours = ((t.time_in_motion || t.duration) ?? 0) / 3600;
        return {
          id: String(t.id),
          name: t.name || "Aktywność",
          date: fmtDate(t.date ?? a.created_at),
          duration: fmtDuration(t.duration ?? 0),
          distance: `${km.toFixed(km < 10 ? 2 : 1)} km`,
          speed: hours > 0 ? `${(km / hours).toFixed(1)} km/h` : "—",
          ascent: `${Math.round(t.elevation_up ?? 0)} m`,
          descent: `${Math.round(t.elevation_down ?? 0)} m`,
        };
      });
    return { ...base, name: user.display_name || fallbackName, items };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "Błąd sieci" };
  }
}

export const scanKomoot = createServerFn({ method: "GET" })
  .inputValidator((data: { users: { userId: string; name: string }[] }) => data)
  .handler(async ({ data }): Promise<ScanResult> => {
    const users = await Promise.all(data.users.map((u) => scanOne(u.userId, u.name)));
    const foundTourIds = users.flatMap((u) => u.items.map((i) => i.id));
    return { scannedAt: new Date().toISOString(), users, foundTourIds };
  });
