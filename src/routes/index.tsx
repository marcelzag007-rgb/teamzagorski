import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { scanKomoot, type KomootActivity } from "@/lib/komoot.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monitor Tras — Team Zagórski" },
      {
        name: "description",
        content:
          "Monitor tras rowerowych Team Zagórski: aktywności i dystans z kont Komoot.",
      },
      { property: "og:title", content: "Monitor Tras — Team Zagórski" },
      {
        property: "og:description",
        content:
          "Monitor tras rowerowych Team Zagórski: aktywności i dystans z kont Komoot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ACCOUNTS = [
  { userId: "2992466765098", name: "Przemek i Gosia" },
  { userId: "5757320444013", name: "Marcel Zagórski" },
];

function Clock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{now}</span>;
}

function Index() {
  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["komoot-scan"],
    queryFn: () => scanKomoot({ data: { users: ACCOUNTS } }),
    refetchInterval: 15 * 60 * 1000,
  });

  const users = data?.users ?? [];
  const allIds = users.flatMap((u) => u.items.map((i) => i.id));
  const sharedIds = new Set(allIds.filter((id, i) => allIds.indexOf(id) !== i));

  const MARCEL_ID = "5757320444013";
  const PG_ID = "2992466765098";
  const countFor = (id: string) => users.find((u) => u.userId === id)?.items.length ?? 0;

  // wspólne trasy liczone raz, żeby nie dublować dystansu
  const uniqueItems = new Map<string, number>();
  users.forEach((u) =>
    u.items.forEach((i) => uniqueItems.set(i.id, parseFloat(i.distance))),
  );
  const totalKm = [...uniqueItems.values()].reduce((a, b) => a + (b || 0), 0);

  return (
    <>
      <div className="streaks" />
      <div className="wrap">
        <header>
          <div className="header-row">
            <div className="title-block">
              <div className="eyebrow">Moduł nawigacji</div>
              <h1>
                TEAM <span>ZAGÓRSKI</span>
              </h1>
            </div>
            <div className="header-right">
              <div className="status-pill">
                <span className="dot" /> ONLINE &nbsp;|&nbsp; <Clock />
              </div>
              {ACCOUNTS.map((a) => (
                <a
                  key={a.userId}
                  className="komoot-link"
                  href={`https://www.komoot.com/pl-pl/user/${a.userId}`}
                  target="_blank"
                  rel="noopener"
                >
                  ↗ {users.find((u) => u.userId === a.userId)?.name ?? a.name}
                </a>
              ))}
            </div>
          </div>
        </header>

        <div className="briefing">
          {[
            { k: "Trasy Marcel", v: String(countFor(MARCEL_ID)) },
            { k: "Trasy Przemek i Gosia", v: String(countFor(PG_ID)) },
            { k: "Całkowity dystans wszystkich tras", v: `${totalKm.toFixed(1)} km` },
          ].map((c) => (
            <div className="brief-cell" key={c.k}>
              <div className="k">{c.k}</div>
              <div className="v">{c.v}</div>
            </div>
          ))}
        </div>

        <div className="control-bar">
          <button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Skanowanie..." : "Skanuj teraz"}
          </button>
          <span className="scan-info">
            {isFetching
              ? `Sprawdzam konta Komoot (${ACCOUNTS.length})...`
              : dataUpdatedAt
                ? `Ostatni skan: ${new Date(dataUpdatedAt).toLocaleTimeString("pl-PL")} · ${allIds.length} aktywności`
                : "Brak danych"}
          </span>
        </div>

        <div className="section-title">
          <h2>Wszystkie aktywności</h2>
          <div className="line" />
        </div>
        <div className="activities-grid">
          {(users.length ? users : ACCOUNTS.map((a) => ({ ...a, items: [] as KomootActivity[], profileUrl: `https://www.komoot.com/pl-pl/user/${a.userId}`, error: undefined }))).map(
            (u) => {
              const km = u.items.reduce((a, i) => a + parseFloat(i.distance), 0);
              return (
                <div className="activity-user" key={u.userId}>
                  <div className="activity-user-head">
                    <a href={u.profileUrl} target="_blank" rel="noopener">
                      {u.name}
                    </a>
                    <span className="activity-user-summary">
                      {u.items.length} aktyw. · {km.toFixed(1)} km
                    </span>
                  </div>
                  {u.error ? (
                    <div className="activity-row">
                      <div className="a-stats">Nie udało się pobrać danych ({u.error})</div>
                    </div>
                  ) : u.items.length === 0 ? (
                    <div className="activity-row">
                      <div className="a-stats">{isFetching ? "Skanowanie..." : "Brak aktywności"}</div>
                    </div>
                  ) : (
                    u.items.map((item) => (
                      <div className="activity-row" key={`${u.userId}-${item.id}`}>
                        <div className="activity-row-top">
                          <a
                            className="a-name"
                            href={`https://www.komoot.com/pl-pl/tour/${item.id}`}
                            target="_blank"
                            rel="noopener"
                          >
                            {item.name}
                            {sharedIds.has(item.id) && <span className="badge-shared">Wspólnie</span>}
                          </a>
                          <span className="a-date">{item.date}</span>
                        </div>
                        <div className="a-stats">
                          <span>
                            <b>{item.distance}</b>
                          </span>
                          <span>{item.duration}</span>
                          <span>{item.speed}</span>
                          <span>▲ {item.ascent}</span>
                          <span>▼ {item.descent}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            },
          )}
        </div>

        <footer>dane pobrane z komoot.com</footer>
      </div>
    </>
  );
}
