// src/pages/Opensource.js
import React, { useEffect, useMemo, useState } from "react";
import { Github, ArrowLeft, Play, Clipboard, ClipboardCheck } from "lucide-react";
import { listCatalog, getDetail, simulateUse } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";

const getDefaultDir = () =>
  localStorage.getItem("oss.directory") || process.env.REACT_APP_OSS_WORKDIR || "/workspace";

export default function Opensource() {
  // 목록/검색
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // 상세/시뮬레이터
  const [selected, setSelected] = useState(null); // 클릭한 아이템(요약)
  const [detail, setDetail] = useState(null);     // 상세 응답
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({ provider: "aws", directory: getDefaultDir() }); // 옵션 폼
  const [simResult, setSimResult] = useState(null);      // 시뮬레이터 결과
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // 아이콘 매핑
  const iconMap = useMemo(() => ({ prowler: prowlerIcon }), []);

  // 카탈로그 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listCatalog();
        setItems(data?.items ?? []);
      } catch (e) {
        // 백엔드 없을 때 더미
        console.warn("[Opensource] catalog fallback:", e);
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
    })();
  }, []);

  // directory 변경 시 localStorage에 저장
  useEffect(() => {
    if (form?.directory) localStorage.setItem("oss.directory", form.directory);
  }, [form?.directory]);

  // 검색 필터
  const filtered = items.filter((x) =>
    [x.name, x.code, x.category, x.desc]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  // 카드 클릭 → 가운데 영역을 상세 화면으로 전환
  const onCardClick = async (it) => {
    setSelected(it);
    setDetail(null);
    setSimResult(null);
    setCopied(false);
    setForm({ provider: "aws", directory: getDefaultDir() });
    setError("");
    setDetailLoading(true);

    try {
      const d = await getDetail(it.code);
      setDetail(d);

      // 옵션 기본값을 form에 반영
      const opts = d?.detail?.options || [];
      const base = {};
      for (const o of opts) {
        if (o.default !== undefined) base[o.key] = o.default;
      }
      setForm((prev) => ({ ...base, ...prev }));
    } catch (e) {
      setError(String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  // 목록으로 복귀
  const backToList = () => {
    setSelected(null);
    setDetail(null);
    setSimResult(null);
    setCopied(false);
    setError("");
  };

  // 옵션 변경
  const onChangeField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 커맨드 생성(시뮬레이터)
  const onSimulate = async () => {
    if (!selected) return;
    setSimResult(null);
    setCopied(false);
    setError("");

    if (!form.directory || String(form.directory).trim().length === 0) {
      setError('Invalid options: "directory" is required');
      return;
    }

    try {
      const res = await simulateUse(selected.code, form);
      setSimResult(res);
    } catch (e) {
      setError(String(e));
    }
  };

  // 복사
  const copyCmd = async () => {
    if (!simResult?.command) return;
    try {
      await navigator.clipboard.writeText(simResult.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // ───────── 렌더링 ─────────

  // (1) 상세 화면
  if (selected) {
    const iconSrc = iconMap[selected.code];
    const hasDirectoryOption = Array.isArray(detail?.detail?.options)
      ? detail.detail.options.some((o) => o.key === "directory")
      : false;

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{selected.name}</h1>
          <button
            onClick={backToList}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
        </div>

        {detailLoading && <div className="text-sm text-gray-500">상세 불러오는 중…</div>}
        {!!error && <div className="text-sm text-red-600 mb-3">오류: {error}</div>}

        {!detailLoading && detail && (
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-start gap-4 bg-white p-5 rounded-xl border">
              <div className="shrink-0">
                {iconSrc ? (
                  <img src={iconSrc} alt={`${selected.name} icon`} className="w-12 h-12 rounded-lg" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 border" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold">{detail.name}</div>
                <div className="text-sm text-gray-500">{detail.category}</div>
                <p className="text-sm mt-2">{detail.desc}</p>
                {Array.isArray(detail.tags) && detail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detail.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {detail.license && <div className="text-xs text-gray-500 mt-2">License: {detail.license}</div>}
                {detail.homepage && (
                  <div className="mt-2">
                    <a
                      href={detail.homepage}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            {detail?.detail?.about && (
              <div className="bg-white p-5 rounded-xl border">
                <div className="text-base font-medium mb-2">About</div>
                <p className="text-sm text-gray-700">{detail.detail.about}</p>
              </div>
            )}

            {/* 항상 노출되는 Working Directory */}
            <div className="bg-white p-5 rounded-xl border">
              <div className="text-base font-medium mb-2">Working Directory</div>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="/workspace (컨테이너 내부 또는 서버 기준 경로)"
                value={form.directory || ""}
                onChange={(e) => onChangeField("directory", e.target.value)}
              />
              {!hasDirectoryOption && (
                <p className="text-xs text-gray-500 mt-1">
                  * 이 도구는 실행 시 <code>directory</code> 옵션이 필수입니다.
                </p>
              )}
            </div>

            {/* Options + Simulator */}
            {Array.isArray(detail?.detail?.options) && detail.detail.options.length > 0 && (
              <div className="bg-white p-5 rounded-xl border">
                <div className="text-base font-medium mb-3">Options</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {detail.detail.options.map((opt) => {
                    const key = opt.key;
                    const visibleIf = opt.visible_if || null;

                    if (visibleIf) {
                      const [vk, vv] = Object.entries(visibleIf)[0];
                      if (form[vk] !== vv) return null;
                    }

                    if (opt.type === "enum") {
                      return (
                        <div key={key} className="flex flex-col">
                          <label className="text-sm text-gray-700">{opt.label}</label>
                          <select
                            className="border rounded-lg px-3 py-2"
                            value={form[key] ?? opt.default ?? ""}
                            onChange={(e) => onChangeField(key, e.target.value)}
                          >
                            <option value="" disabled>선택…</option>
                            {opt.values?.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                          {opt.help && <p className="text-xs text-gray-500 mt-1">{opt.help}</p>}
                        </div>
                      );
                    }

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
                                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
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

                <div className="flex items-center gap-2 mt-4">
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

                {simResult?.error && (
                  <div className="text-sm text-red-600 mt-3">시뮬레이터 실패: {String(simResult.message || "")}</div>
                )}
                {simResult?.command && (
                  <pre className="text-xs border rounded-lg p-3 bg-gray-50 overflow-x-auto mt-3">
                    {simResult.command}
                  </pre>
                )}
              </div>
            )}

            {/* CLI 예시 */}
            {Array.isArray(detail?.detail?.cli_examples) && detail.detail.cli_examples.length > 0 && (
              <div className="bg-white p-5 rounded-xl border">
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

            {/* 안내 */}
            {(detail?.detail?.use_endpoint || detail?.detail?.disclaimer) && (
              <div className="text-xs text-gray-500">
                {detail?.detail?.use_endpoint && (
                  <>
                    Use endpoint: <code>{detail.detail.use_endpoint}</code> (백엔드 기준)
                    <br />
                  </>
                )}
                {detail?.detail?.disclaimer && <>{detail.detail.disclaimer}</>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // (2) 목록 화면
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
          const iconSrc = it.iconSrc || iconMap[it.code];

          return (
            <button
              key={it.code}
              onClick={() => onCardClick(it)}
              className="relative text-left border rounded-xl p-4 bg-white hover:shadow-md transition focus:outline-none"
            >
              {/* 우상단 GitHub 버튼 */}
              <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
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
                    <img src={iconSrc} alt={`${it.name} icon`} className="w-10 h-10 rounded-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 border" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{it.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{it.category}</div>
                  <p className="text-sm mt-2 line-clamp-3">{it.desc}</p>

                  {/* 태그 */}
                  {Array.isArray(it.tags) && it.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {it.tags.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {it.license && (
                    <div className="text-xs text-gray-500 mt-2">License: {it.license}</div>
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
    </div>
  );
}
