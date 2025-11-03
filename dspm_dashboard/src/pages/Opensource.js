// src/pages/Opensource.js
import React, { useEffect, useMemo, useState } from "react";
import { Github, X, Play, Clipboard, ClipboardCheck } from "lucide-react";
import prowlerIcon from "../assets/oss/prowler.png";

export default function Opensource() {
  // 목록/검색
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // 상세 패널/시뮬레이터
  const [selected, setSelected] = useState(null); // 리스트에서 클릭한 항목(요약)
  const [detail, setDetail] = useState(null);     // 백엔드 상세 응답
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({ provider: "aws" }); // 옵션 폼 상태
  const [simResult, setSimResult] = useState(null);      // 시뮬레이터 결과
  const [copied, setCopied] = useState(false);

  // 아이콘 매핑
  const iconMap = useMemo(
    () => ({
      prowler: prowlerIcon,
    }),
    []
  );

  // 백엔드 베이스 (현재 서버 구조: /oss/api/oss/*)
  const API_BASE = process.env.REACT_APP_OSS_BASE || "/oss";

  // 공용 fetch JSON
  const _fetchJSON = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  };

  // 카탈로그 불러오기
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await _fetchJSON(`${API_BASE}/api/oss`);
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
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상세 호출
  const fetchDetail = async (code) => {
    return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}`);
  };

  // 시뮬레이터 호출
  const simulateUse = async (code, payload) => {
    return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  };

  const filtered = items.filter((x) =>
    [x.name, x.code, x.category, x.desc]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  // 카드 클릭 → 상세 패널 오픈
  const onCardClick = async (it) => {
    setSelected(it);
    setDetail(null);
    setSimResult(null);
    setCopied(false);
    setForm({ provider: "aws" });
    setDetailLoading(true);

    try {
      const d = await fetchDetail(it.code);
      setDetail(d);

      // 옵션 기본값 form에 반영
      const opts = d?.detail?.options || [];
      const base = {};
      for (const o of opts) {
        if (o.default !== undefined) base[o.key] = o.default;
      }
      setForm((prev) => ({ ...base, ...prev }));
    } catch (e) {
      setDetail({ error: true, message: String(e) });
    } finally {
      setDetailLoading(false);
    }
  };

  const closePanel = () => {
    setSelected(null);
    setDetail(null);
    setSimResult(null);
    setCopied(false);
  };

  const onChangeField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSimulate = async () => {
    if (!selected) return;
    setSimResult(null);
    setCopied(false);
    try {
      const res = await simulateUse(selected.code, form);
      setSimResult(res);
    } catch (e) {
      setSimResult({ error: true, message: String(e) });
    }
  };

  const copyCmd = async () => {
    if (!simResult?.command) return;
    try {
      await navigator.clipboard.writeText(simResult.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Opensource</h1>

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
          const iconSrc =
            it.iconSrc /* API에서 내려올 수도 있음 */ ||
            iconMap[it.code]; /* 코드 기반 로컬 매핑 */

          return (
            <button
              key={it.code}
              onClick={() => onCardClick(it)}
              className="relative text-left border rounded-xl p-4 bg-white hover:shadow-md transition focus:outline-none"
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
            </button>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-gray-500">결과 없음</div>
        )}
      </div>

      {/* 상세 패널 (우측 슬라이드) */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={closePanel}>
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-semibold">{selected.name}</div>
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-gray-50"
                onClick={closePanel}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading && <div className="text-sm text-gray-500">상세 불러오는 중…</div>}

            {!detailLoading && detail?.error && (
              <div className="text-sm text-red-600">로드 실패: {String(detail.message || "")}</div>
            )}

            {!detailLoading && detail && !detail.error && (
              <>
                <p className="text-sm text-gray-700 mb-3">{detail?.detail?.about}</p>

                {/* 옵션 폼 */}
                {Array.isArray(detail?.detail?.options) && detail.detail.options.length > 0 && (
                  <div className="mb-5">
                    <div className="text-base font-medium mb-2">Options</div>
                    <div className="space-y-3">
                      {detail.detail.options.map((opt) => {
                        const key = opt.key;
                        const visibleIf = opt.visible_if || null;

                        // 간단 visible_if 처리 (예: { provider: "aws" })
                        if (visibleIf) {
                          const [vk, vv] = Object.entries(visibleIf)[0];
                          if (form[vk] !== vv) return null;
                        }

                        // enum
                        if (opt.type === "enum") {
                          return (
                            <div key={key} className="flex flex-col">
                              <label className="text-sm text-gray-700">{opt.label}</label>
                              <select
                                className="border rounded-lg px-3 py-2"
                                value={form[key] ?? opt.default ?? ""}
                                onChange={(e) => onChangeField(key, e.target.value)}
                              >
                                <option value="" disabled>
                                  선택…
                                </option>
                                {opt.values?.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                              {opt.help && <p className="text-xs text-gray-500 mt-1">{opt.help}</p>}
                            </div>
                          );
                        }

                        // array[string]
                        if (opt.type === "array[string]") {
                          const val = Array.isArray(form[key]) ? form[key].join(",") : (form[key] || "");
                          return (
                            <div key={key} className="flex flex-col">
                              <label className="text-sm text-gray-700">{opt.label}</label>
                              <input
                                className="border rounded-lg px-3 py-2"
                                placeholder={opt.placeholder || "comma,separated,values"}
                                value={val}
                                onChange={(e) =>
                                  onChangeField(
                                    key,
                                    e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  )
                                }
                              />
                              {opt.help && <p className="text-xs text-gray-500 mt-1">{opt.help}</p>}
                            </div>
                          );
                        }

                        // string
                        return (
                          <div key={key} className="flex flex-col">
                            <label className="text-sm text-gray-700">{opt.label}</label>
                            <input
                              className="border rounded-lg px-3 py-2"
                              placeholder={opt.placeholder || ""}
                              value={form[key] ?? ""}
                              onChange={(e) => onChangeField(key, e.target.value)}
                            />
                            {opt.help && <p className="text-xs text-gray-500 mt-1">{opt.help}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 시뮬레이터 */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={onSimulate}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:opacity-90"
                  >
                    <Play className="w-4 h-4" />
                    Build command
                  </button>

                  {simResult?.command && (
                    <button
                      onClick={copyCmd}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      {copied ? <ClipboardCheck className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>

                {/* 결과 출력 */}
                {simResult?.error && (
                  <div className="text-sm text-red-600 mb-3">시뮬레이터 실패: {String(simResult.message || "")}</div>
                )}
                {simResult?.command && (
                  <pre className="text-xs border rounded-lg p-3 bg-gray-50 overflow-x-auto">{simResult.command}</pre>
                )}

                {/* CLI 예시 */}
                {Array.isArray(detail?.detail?.cli_examples) && detail.detail.cli_examples.length > 0 && (
                  <div className="mt-6">
                    <div className="text-base font-medium mb-2">CLI Examples</div>
                    <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                      {detail.detail.cli_examples.map((ex, i) => (
                        <li key={i}>
                          <code className="px-1 py-0.5 rounded bg-gray-100">{ex}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 안내/엔드포인트 */}
                {detail?.detail?.use_endpoint && (
                  <p className="text-xs text-gray-500 mt-4">
                    Use endpoint: <code>{detail.detail.use_endpoint}</code> (백엔드 기준)
                  </p>
                )}
                {detail?.detail?.disclaimer && (
                  <p className="text-xs text-gray-500 mt-2">{detail.detail.disclaimer}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
