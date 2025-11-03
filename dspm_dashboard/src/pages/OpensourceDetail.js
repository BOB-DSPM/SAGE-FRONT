// src/pages/OpensourceDetail.js
// (선택 파일) 별도 라우트로 상세를 띄우고 싶을 때 사용.
// 현재 "가운데 콘텐츠만 전환" 흐름에서는 미사용이지만,
// 향후 /dashboard/opensource/:code 페이지를 열 계획이면 그대로 두세요.

import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Clipboard, ClipboardCheck, ArrowLeft } from "lucide-react";
import { getDetail, simulateUse } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";

export default function OpensourceDetail() {
  const { code } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [form, setForm] = useState({ provider: "aws" });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const iconMap = useMemo(() => ({ prowler: prowlerIcon }), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await getDetail(code);
        setDetail(d);

        const opts = d?.detail?.options || [];
        const base = {};
        for (const o of opts) {
          if (o.default !== undefined) base[o.key] = o.default;
        }
        setForm((prev) => ({ ...base, ...prev }));
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const onChangeField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSimulate = async () => {
    setSimResult(null);
    setCopied(false);
    setError("");
    try {
      const res = await simulateUse(code, form);
      setSimResult(res);
    } catch (e) {
      setError(String(e));
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

  const iconSrc = iconMap[code];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/overview"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-white bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Open Source Detail</h1>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">불러오는 중…</div>}
        {!!error && <div className="text-sm text-red-600 mb-3">오류: {error}</div>}

        {!loading && detail && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-white p-5 rounded-xl shadow-sm">
              <div className="shrink-0">
                {iconSrc ? (
                  <img src={iconSrc} alt={`${detail.name} icon`} className="w-12 h-12 rounded-lg" />
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
              </div>
            </div>

            {detail?.detail?.about && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="text-base font-medium mb-2">About</div>
                <p className="text-sm text-gray-700">{detail.detail.about}</p>
              </div>
            )}

            {Array.isArray(detail?.detail?.options) && detail.detail.options.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
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
                    onClick={async () => {
                      setSimResult(null);
                      setCopied(false);
                      setError("");
                      try {
                        const res = await simulateUse(code, form);
                        setSimResult(res);
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:opacity-90"
                  >
                    <Play className="w-4 h-4" />
                    Build command
                  </button>

                  {simResult?.command && (
                    <button
                      onClick={async () => {
                        if (!simResult?.command) return;
                        try {
                          await navigator.clipboard.writeText(simResult.command);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch {}
                      }}
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

            {Array.isArray(detail?.detail?.cli_examples) && detail.detail.cli_examples.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
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

            {detail?.detail?.use_endpoint && (
              <div className="text-xs text-gray-500">
                Use endpoint: <code>{detail.detail.use_endpoint}</code> (백엔드 기준)
              </div>
            )}
            {detail?.detail?.disclaimer && (
              <div className="text-xs text-gray-500">{detail.detail.disclaimer}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}