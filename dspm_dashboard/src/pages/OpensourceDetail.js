// src/pages/OpensourceDetail.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Clipboard, ClipboardCheck, ArrowLeft } from "lucide-react";
import { getDetail, runTool } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";

export default function OpensourceDetail() {
  const { code } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  // 실행 결과
  const [runLoading, setRunLoading] = useState(false);
  const [runRes, setRunRes] = useState(null); // {rc, stdout, stderr, files, command, preinstall, ...}
  const [form, setForm] = useState({ provider: "aws", pip_install: "true" });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const iconMap = useMemo(() => ({ prowler: prowlerIcon }), []);
  const iconSrc = iconMap[code];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setRunRes(null);
      try {
        const d = await getDetail(code);
        setDetail(d);
        // 옵션 기본값 채우기
        const opts = d?.detail?.options || [];
        const base = {};
        for (const o of opts) {
          if (o.default !== undefined) base[o.key] = o.default;
        }
        // 기본 실행 편의값
        setForm((prev) => ({
          ...base,
          ...prev,
          provider: base.provider ?? "aws",
          pip_install: base.pip_install ?? "true",
          timeout_sec: base.timeout_sec ?? "900",
          output: base.output ?? "outputs",
        }));
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

  // ✅ Build command → 실제 실행으로 변경
  const onRun = async () => {
    setRunRes(null);
    setCopied(false);
    setError("");
    setRunLoading(true);
    try {
      const res = await runTool(code, form); // 실행 호출
      setRunRes(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunLoading(false);
    }
  };

  const copyCmd = async () => {
    const cmd = runRes?.command;
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

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
            {/* 헤더 */}
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

            {/* About */}
            {detail?.detail?.about && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="text-base font-medium mb-2">About</div>
                <p className="text-sm text-gray-700">{detail.detail.about}</p>
              </div>
            )}

            {/* 옵션 폼 */}
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

                {/* 실행 버튼 */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={onRun}
                    disabled={runLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Play className="w-4 h-4" />
                    {runLoading ? "Running..." : "Build & Run"}
                  </button>

                  {runRes?.command && (
                    <button
                      onClick={copyCmd}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                    >
                      {copied ? <ClipboardCheck className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy command"}
                    </button>
                  )}
                </div>

                {/* 실행 결과 */}
                {runRes && (
                  <div className="mt-4 space-y-4">
                    <div className="text-sm">
                      <div><span className="font-medium">Exit code:</span> {runRes.rc}</div>
                      <div><span className="font-medium">Duration:</span> {runRes.duration_ms} ms</div>
                      <div><span className="font-medium">Run dir:</span> <code>{runRes.run_dir}</code></div>
                      <div><span className="font-medium">Output dir:</span> <code>{runRes.output_dir}</code></div>
                    </div>

                    {/* preinstall (pip) 로그 */}
                    {runRes.preinstall && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-sm font-medium mb-2">pip install (pre-run)</div>
                        <div className="text-xs text-gray-700 mb-2">
                          <div>checked_before.exists: {String(runRes.preinstall.checked_before?.exists)}</div>
                          <div>installed: {String(runRes.preinstall.installed)}</div>
                          <div>check_after.exists: {String(runRes.preinstall.check_after?.exists)}</div>
                        </div>
                        {runRes.preinstall.pip_log && (
                          <>
                            <div className="text-xs text-gray-500">pip cmd: <code>{runRes.preinstall.pip_log.cmd}</code></div>
                            <pre className="text-xs mt-2 p-2 bg-white border rounded overflow-x-auto">
{runRes.preinstall.pip_log.stdout}
                            </pre>
                            {runRes.preinstall.pip_log.stderr && (
                              <pre className="text-xs mt-2 p-2 bg-white border rounded overflow-x-auto text-red-600">
{runRes.preinstall.pip_log.stderr}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* stdout / stderr */}
                    {runRes.command && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-sm font-medium">Command</div>
                        <pre className="text-xs mt-1 p-2 bg-white border rounded overflow-x-auto">{runRes.command}</pre>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-sm font-medium">STDOUT</div>
                        <pre className="text-xs mt-1 p-2 bg-white border rounded overflow-x-auto">
{runRes.stdout || ""}
                        </pre>
                      </div>
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-sm font-medium">STDERR</div>
                        <pre className="text-xs mt-1 p-2 bg-white border rounded overflow-x-auto text-red-600">
{runRes.stderr || ""}
                        </pre>
                      </div>
                    </div>

                    {/* 생성 파일 리스트 */}
                    {Array.isArray(runRes.files) && runRes.files.length > 0 && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="text-sm font-medium mb-2">Generated files</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left">
                                <th className="py-1 pr-4">Path</th>
                                <th className="py-1 pr-4">Size</th>
                                <th className="py-1">mtime</th>
                              </tr>
                            </thead>
                            <tbody>
                              {runRes.files.map((f, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="py-1 pr-4"><code>{f.path}</code></td>
                                  <td className="py-1 pr-4">{f.size}</td>
                                  <td className="py-1">{f.mtime}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          파일은 서버 내부 <code>{runRes.output_dir}</code> 하위에 생성됩니다.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CLI 예시 */}
            {Array.isArray(detail?.detail?.cli_examples) && detail.detail.cli_examples.length > 0 && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="text-base font-medium mb-2">CLI Examples</div>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {detail.detail.cli_examples.map((ex, i) => (
                    <li key={i}><code className="px-1 py-0.5 rounded bg-gray-100">{ex}</code></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
