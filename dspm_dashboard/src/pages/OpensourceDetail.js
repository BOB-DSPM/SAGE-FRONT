// src/pages/OpensourceDetail.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play,
  Clipboard,
  ClipboardCheck,
  ArrowLeft,
  Activity,
  RefreshCw,
} from "lucide-react";
import { getDetail, runTool } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";

// 프록시(Nginx) 사용 시 "/oss", 절대주소 사용할 땐 REACT_APP_OSS_BASE에 설정
const API_BASE = process.env.REACT_APP_OSS_BASE || "/oss";
const getDefaultDir = () =>
  localStorage.getItem("oss.directory") || process.env.REACT_APP_OSS_WORKDIR || "/workspace";

export default function OpensourceDetail() {
  const { code } = useParams();

  // 상세 데이터
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 폼/옵션
  const [form, setForm] = useState({
    provider: "aws",
    pip_install: "true",
    timeout_sec: "900",
    output: "outputs",
    directory: getDefaultDir(),
  });

  // 일괄 실행(완료 후 한번에 결과 받기)
  const [runLoading, setRunLoading] = useState(false);
  const [runRes, setRunRes] = useState(null); // {rc, stdout, stderr, files, command, preinstall, ...}
  const [copied, setCopied] = useState(false);

  // 실시간 실행(스트리밍)
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveLog, setLiveLog] = useState(""); // 누적 텍스트 로그
  const [summary, setSummary] = useState(null); // 마지막 요약(JSON)
  const [streamErr, setStreamErr] = useState("");

  // 자동 스크롤
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [liveLog]);

  // directory 변경 시 localStorage 반영
  useEffect(() => {
    if (form?.directory) localStorage.setItem("oss.directory", form.directory);
  }, [form?.directory]);

  // 아이콘 매핑
  const iconMap = useMemo(() => ({ prowler: prowlerIcon }), []);
  const iconSrc = iconMap[code];

  // 상세 로드 + 옵션 기본값 주입
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setRunRes(null);
      setLiveLog("");
      setSummary(null);
      try {
        const d = await getDetail(code);
        setDetail(d);
        const opts = d?.detail?.options || [];
        const base = {};
        for (const o of opts) {
          if (o.default !== undefined) base[o.key] = o.default;
        }
        setForm((prev) => ({
          ...prev,
          ...base,
          provider: base.provider ?? "aws",
          pip_install: base.pip_install ?? "true",
          timeout_sec: base.timeout_sec ?? "900",
          output: base.output ?? "outputs",
          directory: prev.directory || getDefaultDir(),
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

  // =============== 일괄 실행(완료 후 한 번에 결과 반환) ===============
  const onRunOnce = async () => {
    setRunRes(null);
    setCopied(false);
    setError("");

    if (!form.directory || String(form.directory).trim().length === 0) {
      setError('Invalid options: "directory" is required');
      return;
    }

    setRunLoading(true);
    try {
      const res = await runTool(code, form);
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

  // =============== 실시간 실행(스트리밍) ===============
  const onRunLive = async () => {
    setLiveRunning(true);
    setLiveLog("");
    setStreamErr("");
    setSummary(null);

    if (!form.directory || String(form.directory).trim().length === 0) {
      setStreamErr('Invalid options: "directory" is required');
      setLiveRunning(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/oss/${encodeURIComponent(code)}/run/stream`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // 스트림 읽기 루프
      while (true) {
        const { done, value } = await reader.read();
        const chunk = value ? decoder.decode(value, { stream: true }) : "";
        if (chunk) {
          setLiveLog((prev) => prev + chunk);

          // summary 후보(JSON 한 줄)를 파싱해 상태 갱신
          // 요약은 서버가 마지막에 {"summary": {...}}로 한 번 내려줌
          buf += chunk;
          const lastBrace = buf.lastIndexOf("\n{");
          if (lastBrace !== -1) {
            const tail = buf.slice(lastBrace + 1).trim();
            try {
              const parsed = JSON.parse(tail);
              if (parsed && parsed.summary) {
                setSummary(parsed.summary);
              }
            } catch {
              /* noop */
            }
          }
        }
        if (done) break;
      }
    } catch (e) {
      setStreamErr(String(e));
      setLiveLog((prev) => prev + `\n[ERROR] ${String(e)}\n`);
    } finally {
      setLiveRunning(false);
    }
  };

  const clearLive = () => {
    setLiveLog("");
    setSummary(null);
    setStreamErr("");
  };

  // ===== 렌더 보조 =====
  const hasOptions =
    Array.isArray(detail?.detail?.options) &&
    detail.detail.options.length > 0;

  const hasDirectoryOption = Array.isArray(detail?.detail?.options)
    ? detail.detail.options.some((o) => o.key === "directory")
    : false;

  // ========================= 렌더 =========================
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
                  <img
                    src={iconSrc}
                    alt={`${detail.name} icon`}
                    className="w-12 h-12 rounded-lg"
                  />
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
                      <span
                        key={t}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {detail.license && (
                  <div className="text-xs text-gray-500 mt-2">
                    License: {detail.license}
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            {detail?.detail?.about && (
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="text-base font-medium mb-2">About</div>
                <p className="text-sm text-gray-700">{detail.detail.about}</p>
              </div>
            )}

            {/* 항상 노출되는 Working Directory */}
            <div className="bg-white p-5 rounded-xl shadow-sm">
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

            {/* 옵션 폼 (옵션이 있을 때만) */}
            {hasOptions && (
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
                          <label className="text-sm text-gray-700">
                            {opt.label}
                          </label>
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
                          {opt.help && (
                            <p className="text-xs text-gray-500 mt-1">
                              {opt.help}
                            </p>
                          )}
                        </div>
                      );
                    }

                    if (opt.type === "array[string]") {
                      const val = Array.isArray(form[key])
                        ? form[key].join(",")
                        : form[key] || "";
                      return (
                        <div key={key} className="flex flex-col">
                          <label className="text-sm text-gray-700">
                            {opt.label}
                          </label>
                          <input
                            className="border rounded-lg px-3 py-2"
                            placeholder={
                              opt.placeholder || "comma,separated,values"
                            }
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
                          {opt.help && (
                            <p className="text-xs text-gray-500 mt-1">
                              {opt.help}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex flex-col">
                        <label className="text-sm text-gray-700">
                          {opt.label}
                        </label>
                        <input
                          className="border rounded-lg px-3 py-2"
                          placeholder={opt.placeholder || ""}
                          value={form[key] ?? ""}
                          onChange={(e) => onChangeField(key, e.target.value)}
                        />
                        {opt.help && (
                          <p className="text-xs text-gray-500 mt-1">
                            {opt.help}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 실행 버튼들 — 항상 표시 (옵션 유무와 무관) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* 일괄 실행 */}
              <button
                onClick={onRunOnce}
                disabled={runLoading || liveRunning}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
                title="실행 완료 후 한번에 결과 수신"
              >
                <Play className="w-4 h-4" />
                {runLoading ? "Running..." : "Build & Run (once)"}
              </button>

              {/* 실시간 실행 */}
              <button
                onClick={onRunLive}
                disabled={liveRunning || runLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
                title="실시간 로그 스트리밍"
              >
                <Activity className="w-4 h-4" />
                {liveRunning ? "Running (Live)..." : "Run (Live)"}
              </button>

              {/* 실시간 로그 초기화 */}
              <button
                onClick={clearLive}
                disabled={liveRunning}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
                title="실시간 로그 초기화"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Live Log
              </button>

              {/* one-shot 명령 복사 */}
              {runRes?.command && (
                <button
                  onClick={copyCmd}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {copied ? (
                    <ClipboardCheck className="w-4 h-4" />
                  ) : (
                    <Clipboard className="w-4 h-4" />
                  )}
                  {copied ? "Copied!" : "Copy command"}
                </button>
              )}
            </div>

            {/* 일괄 실행 결과 */}
            {runRes && (
              <div className="mt-4 space-y-4">
                <div className="text-sm">
                  <div>
                    <span className="font-medium">Exit code:</span>{" "}
                    {runRes.rc}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>{" "}
                    {runRes.duration_ms} ms
                  </div>
                  <div>
                    <span className="font-medium">Run dir:</span>{" "}
                    <code>{runRes.run_dir}</code>
                  </div>
                  <div>
                    <span className="font-medium">Output dir:</span>{" "}
                    <code>{runRes.output_dir}</code>
                  </div>
                </div>

                {/* preinstall (pip) 로그 */}
                {runRes.preinstall && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="text-sm font-medium mb-2">
                      pip install (pre-run)
                    </div>
                    <div className="text-xs text-gray-700 mb-2">
                      <div>
                        checked_before.exists:{" "}
                        {String(runRes.preinstall.checked_before?.exists)}
                      </div>
                      <div>installed: {String(runRes.preinstall.installed)}</div>
                      <div>
                        check_after.exists:{" "}
                        {String(runRes.preinstall.check_after?.exists)}
                      </div>
                    </div>
                    {runRes.preinstall.pip_log && (
                      <>
                        <div className="text-xs text-gray-500">
                          pip cmd: <code>{runRes.preinstall.pip_log.cmd}</code>
                        </div>
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
                    <pre className="text-xs mt-1 p-2 bg-white border rounded overflow-x-auto">
                      {runRes.command}
                    </pre>
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
                    <div className="text-sm font-medium mb-2">
                      Generated files
                    </div>
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
                              <td className="py-1 pr-4">
                                <code>{f.path}</code>
                              </td>
                              <td className="py-1 pr-4">{f.size}</td>
                              <td className="py-1">{f.mtime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      파일은 서버 내부 <code>{runRes.output_dir}</code> 하위에
                      생성됩니다.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 실시간 실행 로그 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Live Log (실시간)</span>
                {liveRunning && (
                  <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    streaming…
                  </span>
                )}
                {!liveRunning && liveLog && (
                  <span className="text-xs text-gray-500">(stopped)</span>
                )}
                {streamErr && (
                  <span className="text-xs text-red-600">{streamErr}</span>
                )}
              </div>
              <pre
                ref={logRef}
                className="text-xs bg-white border rounded p-2 h-80 overflow-auto whitespace-pre-wrap break-words"
              >
                {liveLog}
              </pre>

              {summary && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium mb-2">Summary</div>
                  <div className="text-xs text-gray-700">
                    <div>
                      Run dir: <code>{summary.run_dir}</code>
                    </div>
                    <div>
                      Output dir: <code>{summary.output_dir}</code>
                    </div>
                    <div>Duration: {summary.duration_ms} ms</div>
                  </div>
                  {Array.isArray(summary.files) && summary.files.length > 0 && (
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left">
                            <th className="py-1 pr-4">Path</th>
                            <th className="py-1 pr-4">Size</th>
                            <th className="py-1">mtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.files.map((f, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 pr-4">
                                <code>{f.path}</code>
                              </td>
                              <td className="py-1 pr-4">{f.size}</td>
                              <td className="py-1">{f.mtime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CLI 예시 */}
            {Array.isArray(detail?.detail?.cli_examples) &&
              detail.detail.cli_examples.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow-sm">
                  <div className="text-base font-medium mb-2">CLI Examples</div>
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                    {detail.detail.cli_examples.map((ex, i) => (
                      <li key={i}>
                        <code className="px-1 py-0.5 rounded bg-gray-100">
                          {ex}
                        </code>
                      </li>
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
