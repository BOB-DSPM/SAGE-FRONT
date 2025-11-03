// src/pages/Opensource.js
import React, { useEffect, useState, useMemo } from "react";
import { Github } from "lucide-react";
import prowlerIcon from "../assets/oss/prowler.png";

export default function Opensource() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // 코드 → 아이콘 매핑
  const iconMap = useMemo(
    () => ({
      prowler: prowlerIcon,
    }),
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/oss");
        if (!res.ok) throw new Error("fallback");
        const data = await res.json();
        setItems(data?.items ?? []);
      } catch {
        // 백엔드 미구현 시 더미
        setItems([
          {
            code: "prowler",
            name: "Prowler",
            category: "cloud-security",
            desc: "AWS 보안 점검 CLI",
            homepage: "https://github.com/prowler-cloud/prowler",
            tags: ["aws", "security", "audit", "cli"],
            license: "Apache-2.0",
          },
        ]);
      }
    };
    fetchData();
  }, []);

  const filtered = items.filter((x) =>
    [x.name, x.code, x.category, x.desc]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Opensource</h1>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색 (이름/코드/카테고리/설명)"
          className="w-full md:w-96 border rounded-lg px-3 py-2"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((it) => {
          const iconSrc =
            it.iconSrc /* API에서 내려올 수도 있음 */ ||
            iconMap[it.code]; /* 코드 기반 로컬 매핑 */

          return (
            <div
              key={it.code}
              className="relative border rounded-xl p-4 bg-white hover:shadow-md transition"
            >
              {/* 우상단 GitHub 아이콘 버튼만 링크 */}
              <div className="absolute top-3 right-3">
                <a
                  href={it.homepage}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${it.name} GitHub로 이동`}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-gray-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>

              <div className="flex items-start gap-3">
                {/* 아이콘 썸네일 */}
                <div className="shrink-0">
                  {iconSrc ? (
                    <img
                      src={iconSrc}
                      alt={`${it.name} icon`}
                      className="w-10 h-10 rounded-md"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 border" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{it.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{it.category}</div>
                  <p className="text-sm mt-2 line-clamp-3">{it.desc}</p>

                  {/* 태그 배지 (있으면 표시) */}
                  {Array.isArray(it.tags) && it.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {it.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {it.license && (
                    <div className="text-xs text-gray-500 mt-2">
                      License: {it.license}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500">결과 없음</div>
        )}
      </div>
    </div>
  );
}
