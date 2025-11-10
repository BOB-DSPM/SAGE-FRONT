// ============================================================================
// file: src/pages/Opensource.jsx
// (목록/검색 → 카드 클릭 시 상세로 이동)
// ============================================================================
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Github } from "lucide-react";
import { listCatalog } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";

const getDefaultDir = () =>
  localStorage.getItem("oss.directory") ||
  process.env.REACT_APP_OSS_WORKDIR ||
  "/workspace";

export default function Opensource() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const iconMap = useMemo(() => ({ prowler: prowlerIcon }), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listCatalog();
        setItems(data?.items ?? []);
      } catch (e) {
        console.warn("[Opensource] catalog fallback:", e);
        setItems([
          {
            code: "prowler",
            name: "Prowler",
            category: "cloud-security",
            desc: "AWS 등 여러 클라우드 환경에 대한 보안 점검 자동화 CLI 도구",
            homepage: "https://github.com/prowler-cloud/prowler",
            tags: ["aws", "security", "audit", "cli"],
            license: "Apache-2.0",
          },
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const dir = getDefaultDir();
    if (dir) localStorage.setItem("oss.directory", dir);
  }, []);

  const filtered = items.filter((x) =>
    [x.name, x.code, x.category, x.desc]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  const onCardClick = (it) => navigate(`/opensource/${it.code}`);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Opensource</h1>
        <div className="text-xs text-gray-500">* 카드 클릭 시 상세 페이지로 이동</div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색 (이름/코드/카테고리/설명)"
          className="w-full md:w-96 border rounded-lg px-3 py-2"
        />
        {loading && <span className="text-sm text-gray-500">로딩 중…</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((it) => {
          const iconSrc = it.iconSrc || iconMap[it.code];
          return (
            <button
              key={it.code}
              onClick={() => onCardClick(it)}
              className="relative text-left border rounded-xl p-4 bg-white hover:shadow-md transition focus:outline-none"
            >
              <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                {it.homepage && (
                  <a
                    href={it.homepage}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${it.name} GitHub로 이동`}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-gray-50"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0">
                  {iconSrc ? (
                    <img src={iconSrc} alt={`${it.name} icon`} className="w-10 h-10 rounded-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 border" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{it.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{it.category}</div>
                  <p className="text-sm mt-2 line-clamp-3">{it.desc}</p>

                  {Array.isArray(it.tags) && it.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {it.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {it.license && <div className="text-xs text-gray-500 mt-2">License: {it.license}</div>}
                </div>
              </div>
            </button>
          );
        })}

        {!loading && filtered.length === 0 && <div className="text-sm text-gray-500">결과 없음</div>}
      </div>
    </div>
  );
};