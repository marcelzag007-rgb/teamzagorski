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
          "Monitor tras rowerowych Team Zagórski: planowane trasy, mapy na żywo i automatyczny skan aktywności z kont Komoot.",
      },
      { property: "og:title", content: "Monitor Tras — Team Zagórski" },
      {
        property: "og:description",
        content:
          "Monitor tras rowerowych Team Zagórski: planowane trasy, mapy na żywo i automatyczny skan aktywności z kont Komoot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ROUTES = [
  {
    id: "2605710107",
    name: "Hel – Świnoujście",
    difficulty: "Trudne",
    duration: "27:22 h",
    distance: "421 km",
    distanceKm: 421,
    speed: "15.4 km/h",
    ascent: "1 170 m",
    ascentM: 1170,
    descent: "1 170 m",
    date: "28 września 2025",
  },
  {
    id: "2944456404",
    name: "Sonne Tanken Mural Utility Box – Leśna",
    difficulty: "Trudne",
    duration: "30:04 h",
    distance: "506 km",
    distanceKm: 506,
    speed: "16.8 km/h",
    ascent: "1 670 m",
    ascentM: 1670,
    descent: "1 440 m",
    date: "9 maja 2026",
  },
];

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
  const [activeIdx, setActiveIdx] = useState(0);

  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["komoot-scan"],
    queryFn: () => scanKomoot({ data: { users: ACCOUNTS } }),
    refetchInterval: 15 * 60 * 1000,
  });

  const users = data?.users ?? [];
  const found = new Set(data?.foundTourIds ?? []);
  const isCompleted = (id: string) => found.has(id);

  const totalKm = ROUTES.reduce((a, r) => a + r.distanceKm, 0);
  const totalAsc = ROUTES.reduce((a, r) => a + r.ascentM, 0);
  const doneCount = ROUTES.filter((r) => isCompleted(r.id)).length;

  const allIds = users.flatMap((u) => u.items.map((i) => i.id));
  const sharedIds = new Set(allIds.filter((id, i) => allIds.indexOf(id) !== i));

  const r = ROUTES[activeIdx]!;
  const activeDone = isCompleted(r.id);

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
            { k: "Trasy planowane", v: String(ROUTES.length) },
            { k: "Łączny dystans", v: `${totalKm} km` },
            { k: "Łączny podjazd", v: `${totalAsc.toLocaleString("pl-PL")} m` },
            { k: "Ukończone", v: `${doneCount} / ${ROUTES.length}` },
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
          <h2>Trasy planowane</h2>
          <div className="line" />
        </div>
        <div className="module">
          <div className="tabs">
            {ROUTES.map((route, i) => {
              const done = isCompleted(route.id);
              return (
                <div
                  key={route.id}
                  className={`tab route-${i} ${i === activeIdx ? "active" : ""} ${done ? "completed" : ""}`}
                  onClick={() => setActiveIdx(i)}
                >
                  <div className="tab-route-label">Trasa {i + 1}</div>
                  <div className="tab-name">{route.name}</div>
                  <div className="tab-status">
                    <span className="dotmini" />
                    {done ? "UKOŃCZONA" : "OCZEKUJE"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="stage">
            <div className={`map-frame ${activeDone ? "completed" : ""}`}>
              <span className={`map-label ${activeDone ? "alert" : ""}`}>
                {activeDone ? "⚠ TRASA UKOŃCZONA · " : "MAPA · NA ŻYWO · "}TRASA {activeIdx + 1}
              </span>
              <iframe
                className="show"
                title={r.name}
                loading="lazy"
                src={`https://www.komoot.com/tour/${r.id}/embed?hl=pl&layout=classic&profile=1`}
              />
            </div>
            <div className="stats">
              <div className="route-title">{r.name}</div>
              <div className="route-sub">TOUR_ID // {r.id}</div>
              {[
                ["Trudność", r.difficulty, "diff"],
                ["Dystans", r.distance, "accent"],
                ["Czas", r.duration, ""],
                ["Śr. prędkość", r.speed, ""],
                ["Podjazd", `▲ ${r.ascent}`, ""],
                ["Zjazd", `▼ ${r.descent}`, ""],
                ["Data wyprawy", r.date, ""],
              ].map(([label, value, cls]) => (
                <div className="stat-row" key={label}>
                  <span className="stat-label">{label}</span>
                  <span className={`stat-value ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
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
