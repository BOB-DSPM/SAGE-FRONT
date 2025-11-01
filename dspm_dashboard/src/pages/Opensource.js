// src/pages/Opensource.js
import React, { useEffect, useState, useMemo } from "react";
import prowlerIcon from "../assets/oss/prowler.svg";

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
            <a
              key={it.code}
              href={it.homepage}
              target="_blank"
              rel="noreferrer"
              className="block border rounded-xl p-4 hover:shadow-md transition bg-white"
            >
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
                  {it.license && (
                    <div className="text-xs text-gray-500 mt-2">
                      License: {it.license}
                    </div>
                  )}
                  <div className="text-xs text-blue-600 mt-2 break-all">
                    {it.homepage}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500">결과 없음</div>
        )}
      </div>
    </div>
  );
}
