// src/pages/Opensource.js
import React, { useEffect, useState } from "react";

export default function Opensource() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/oss");
        if (!res.ok) throw new Error("fallback");
        const data = await res.json();
        setItems(data?.items ?? []);
      } catch {
        // 백엔드가 아직 준비 안 된 경우 더미 데이터
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
        {filtered.map((it) => (
          <a
            key={it.code}
            href={it.homepage}
            target="_blank"
            rel="noreferrer"
            className="block border rounded-xl p-4 hover:shadow-md transition bg-white"
          >
            <div className="text-lg font-semibold">{it.name}</div>
            <div className="text-sm text-gray-500 mt-1">{it.category}</div>
            <p className="text-sm mt-2">{it.desc}</p>
            {it.license && (
              <div className="text-xs text-gray-500 mt-2">License: {it.license}</div>
            )}
            <div className="text-xs text-blue-600 mt-2 break-all">{it.homepage}</div>
          </a>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500">결과 없음</div>
        )}
      </div>
    </div>
  );
}
