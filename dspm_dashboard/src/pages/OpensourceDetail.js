// ============================================================================
// file: src/pages/OpensourceDetail.js
// (Run 버튼 + 줄바꿈/ANSI 처리 + 아티팩트 탐지 수정 + 폭/콘솔 높이 반영 + 다운로드 a[download])
// ============================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play,
  Clipboard,
  ClipboardCheck,
  ArrowLeft,
  Activity,
  RefreshCw,
  Download,
  ExternalLink,
  FileText,
  FileJson,
  FileSpreadsheet,
  Terminal,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
} from "lucide-react";
import { getDetail, runTool, getLatestRun, streamRun } from "../services/ossApi";
import prowlerIcon from "../assets/oss/prowler.png";
import custodianrIcon from "../assets/oss/custodian.png";
import scoutIcon from "../assets/oss/scout.png";
import steampipeIcon from "../assets/oss/steampipe.png";

// ─ Utilities ─
const getDefaultDir = () =>
  localStorage.getItem("oss.directory") ||
  process.env.REACT_APP_OSS_WORKDIR ||
  "/workspace";

function validateRequired(detail, form, toolCode) {
  const required = (detail?.detail?.options || []).filter((o) => o.required);
  const missing = [];
  for (const opt of required) {
    const v = form[opt.key];
    // custodian의 경우, policy 대신 policy_text가 채워졌으면 OK 처리
    if (
      toolCode === "custodian" &&
      opt.key === "policy" &&
      typeof form.policy_text === "string" &&
      form.policy_text.trim().length > 0
    ) {
      continue;
    }
    if (v === undefined || v === null || String(v).trim() === "") {
      missing.push(opt.label || opt.key);
    }
  }
  return missing;
}

function stripAnsi(s = "") {
  return s.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
}

function normalizeNewlines(s = "") {
  return s.replace(/\r\n?/g, "\n");
}

function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

function clsx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function maxMtime(files = []) {
  let m = 0;
  for (const f of files) {
    if (typeof f.mtime === "number") m = Math.max(m, f.mtime);
  }
  return m || null;
}

// ─ UI frags ─
function Section({ title, children, right }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-medium">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const toneMap = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <span className={clsx("text-xs px-2 py-1 rounded-full", toneMap[tone])}>{children}</span>;
}

function Collapsible({ title, children, defaultOpen = false, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div>{right}</div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function ButtonLink({ href, children, downloadName }) {
  // downloadName 주어지면 다운로드 버튼에 download 속성 부여
  return (
    <a
      href={href}
      target={downloadName ? undefined : "_blank"}
      rel={downloadName ? undefined : "noreferrer"}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
      {...(downloadName ? { download: downloadName } : {})}
    >
      {children}
    </a>
  );
}

function Copyable({ text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button
      onClick={onCopy}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-gray-50"
    >
      {copied ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// 기본 높이를 600px로 상향
function LogConsole({ title, text, height = 600, follow = true, onFollowChange }) {
  const viewRef = useRef(null);
  useEffect(() => {
    if (follow && viewRef.current) {
      viewRef.current.scrollTop = viewRef.current.scrollHeight;
    }
  }, [text, follow]);

  return (
    <Section
      title={
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span>{title || "Console"}</span>
          <Badge>live</Badge>
        </div>
      }
      right={
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={follow}
            onChange={(e) => onFollowChange?.(e.target.checked)}
          />
          Auto-follow
        </label>
      }
    >
      {/* 줄바꿈 보존 + 긴 줄 자동 줄바꿈 */}
      <pre
        ref={viewRef}
        className="bg-black text-gray-100 rounded-xl p-3 font-mono text-[11px] leading-5 overflow-auto whitespace-pre-wrap break-words"
        style={{ height }}
      >
        {normalizeNewlines(stripAnsi(text || ""))}
      </pre>
    </Section>
  );
}

// ─ Main ─
export default function OpensourceDetail() {
  const { code } = useParams();

  // detail
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // form
  const [form, setForm] = useState({
    provider: "aws",
    pip_install: "true",
    timeout_sec: "900",
    output: "outputs",
    directory: getDefaultDir(),
  });

  // run result
  const [runLoading, setRunLoading] = useState(false);
  const [runRes, setRunRes] = useState(null);
  const [copied, setCopied] = useState(false);

  // live
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveLog, setLiveLog] = useState("");
  const [summary, setSummary] = useState(null);
  const [streamErr, setStreamErr] = useState("");
  const [followTail, setFollowTail] = useState(true);

  // latest flag
  const [fromLatest, setFromLatest] = useState(false);
  const [latestTime, setLatestTime] = useState(null); // seconds epoch

  const iconMap = useMemo(
    () => ({
      prowler: prowlerIcon,
      custodian: custodianrIcon,
      "cloud-custodian": custodianrIcon,
      steampipe: steampipeIcon,
      scout: scoutIcon,
      "scout-suite": scoutIcon,
    }),
    []
  );
  const iconSrc = iconMap[code];

  useEffect(() => {
    if (form?.directory) localStorage.setItem("oss.directory", form.directory);
  }, [form?.directory]);

  // 1) 상세 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setRunRes(null);
      setLiveLog("");
      setSummary(null);
      setFromLatest(false);
      setLatestTime(null);
      try {
        const d = await getDetail(code);
        setDetail(d);
        const opts = d?.detail?.options || [];
        const base = {};
        for (const o of opts) if (o.default !== undefined) base[o.key] = o.default;

        setForm((prev) => {
          const next = {
            ...prev,
            ...base,
            provider: base.provider ?? "aws",
            pip_install: base.pip_install ?? "true",
            timeout_sec: base.timeout_sec ?? "900",
            output: base.output ?? "outputs",
            directory: prev.directory || getDefaultDir(),
          };
          if (code === "steampipe") {
            if (!next.mod || String(next.mod).trim() === "") {
              next.mod = "turbot/steampipe-mod-aws-compliance";
            }
            if (!next.output || String(next.output).trim() === "") {
              next.output = "./outputs";
            }
          }
          return next;
        });
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  // 2) 최근 실행 자동 조회
  useEffect(() => {
    if (!detail) return;
    (async () => {
      try {
        const latest = await getLatestRun(code);
        if (!latest) return;
        setRunRes(latest);
        setFromLatest(true);
        setLatestTime(maxMtime(latest.files));
      } catch {
        /* noop */
      }
    })();
  }, [detail, code]);

  const onChangeField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // 3) 실행 (동기) — 내부 로직은 그대로 두지만 버튼에서는 사용 안 함
  const onRunOnce = async () => {
    setRunRes(null);
    setFromLatest(false);
    setLatestTime(null);
    setCopied(false);
    setError("");

    if (!form.directory || String(form.directory).trim().length === 0) {
      setError('Invalid options: "directory" is required');
      return;
    }
    const missing = validateRequired(detail, form, code);
    if (missing.length > 0) {
      setError(`필수 옵션 누락: ${missing.join(", ")}`);
      return;
    }
    setRunLoading(true);
    try {
      const res = await runTool(code, form);
      setRunRes(res);
      setLatestTime(maxMtime(res.files));
    } catch (e) {
      setError(String(e));
    } finally {
      setRunLoading(false);
    }
  };

  // 4) 실행 (실시간)
  const onRunLive = async () => {
    setFromLatest(false);
    setLatestTime(null);
    setLiveRunning(true);
    setLiveLog("");
    setStreamErr("");
    setSummary(null);

    if (!form.directory || String(form.directory).trim().length === 0) {
      setStreamErr('Invalid options: "directory" is required');
      setLiveRunning(false);
      return;
    }
    const missing = validateRequired(detail, form, code);
    if (missing.length > 0) {
      setStreamErr(`필수 옵션 누락: ${missing.join(", ")}`);
      setLiveRunning(false);
      return;
    }

    try {
      let buf = "";
      await streamRun(code, form, (chunk) => {
        setLiveLog((prev) => prev + chunk);
        buf += chunk;
        const lastBrace = buf.lastIndexOf("\n{");
        if (lastBrace !== -1) {
          const tail = buf.slice(lastBrace + 1).trim();
          try {
            const parsed = JSON.parse(tail);
            if (parsed && parsed.summary) setSummary(parsed.summary);
          } catch {}
        }
      });
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

  const copyCmd = async () => {
    const cmd = runRes?.command;
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // artifacts (outputs/... 경로 대응)
  const files = runRes?.files || [];
  const top = (ext) => files.find((f) => String(f.path || "").toLowerCase().endsWith(ext));
  const artHtml = top(".html");
  const artCsv = top(".csv");
  const artJson = files.find((f) => String(f.path || "").toLowerCase().endsWith(".ocsf.json"));
  const artLog = files.find((f) => /(^|\/)log\.txt$/i.test(String(f.path || "")));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 가로 폭을 더 넓게: max-w-screen-2xl */}
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/opensource"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-white bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold">오픈소스 세부내용</h1>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">불러오는 중…</div>}
        {!!error && <div className="text-sm text-red-600 mb-3">오류: {error}</div>}

        {!loading && detail && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-sm border">
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
                  <div className="text-xs text-gray-500 mt-2">License: {detail.license}</div>
                )}
              </div>
            </div>

            {detail?.detail?.about && (
              <Section title="About">
                <p className="text-sm text-gray-700">{detail.detail.about}</p>
              </Section>
            )}

            {/* 최근 실행 자동 로드 알림/CTA */}
            {fromLatest ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-blue-50 text-blue-800">
                <Info className="w-4 h-4" />
                <div className="text-sm">
                  최근 실행 결과를 불러왔습니다
                  {latestTime ? ` (기준: ${formatDate(latestTime)})` : ""}.
                </div>
                <div className="ml-auto">
                  <button
                    onClick={onRunLive}
                    disabled={liveRunning}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Play className="w-4 h-4" />
                    다시 실행 (Live)
                  </button>
                </div>
              </div>
            ) : (
              !runRes && (
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 text-amber-900">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div className="text-sm">
                    최근 실행 결과가 없습니다. 아래 옵션을 확인한 뒤 실행해 보세요.
                  </div>
                </div>
              )
            )}

            {/* Working dir */}
            <Section title="Working Directory">
              <input
                className="border rounded-lg px-3 py-2 w-full"
                placeholder="/workspace (컨테이너 내부 또는 서버 기준 경로)"
                value={form.directory || ""}
                onChange={(e) => onChangeField("directory", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                * 일부 도구는 <code>directory</code>가 필수입니다.
              </p>
            </Section>

            {/* ✅ Custodian 전용: YAML 정책 입력 */}
            {code === "custodian" && (
              <Section title="Custodian Policy (YAML)">
                <textarea
                  className="border rounded-lg px-3 py-2 w-full font-mono text-sm"
                  rows={14}
                  placeholder={
                    "예시:\npolicies:\n  - name: s3-no-encryption\n    resource: aws.s3\n    filters:\n      - type: bucket-encryption\n        state: false"
                  }
                  value={form.policy_text || ""}
                  onChange={(e) => onChangeField("policy_text", e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  * 파일 경로(<code>policy</code>) 대신 직접 YAML을 입력하면 자동으로 저장되어 실행됩니다.
                </p>
              </Section>
            )}

            {/* Options */}
            {Array.isArray(detail?.detail?.options) && detail.detail.options.length > 0 && (
              <Section title="Options">
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
                            <p className="text-xs text-gray-500 mt-1">{opt.help}</p>
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
                          {opt.help && (
                            <p className="text-xs text-gray-500 mt-1">{opt.help}</p>
                          )}
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
                        {opt.help && (
                          <p className="text-xs text-gray-500 mt-1">{opt.help}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Actions — 실행 버튼은 Run (Live)만 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onRunLive}
                disabled={liveRunning || runLoading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-60 shadow-sm"
              >
                <Activity className="w-4 h-4" />
                {liveRunning ? "Running (Live)..." : "Run (Live)"}
              </button>

              <button
                onClick={clearLive}
                disabled={liveRunning}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-60 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Live Log
              </button>

              {runRes?.command && (
                <button
                  onClick={copyCmd}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50 shadow-sm"
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

            {/* Live Console (height=600) */}
            <LogConsole
              title="Live Log (실시간)"
              text={liveLog}
              follow={followTail}
              onFollowChange={setFollowTail}
            />
            {streamErr && <div className="text-xs text-red-600">{streamErr}</div>}

            {/* Run Results */}
            {runRes && (
              <div className="space-y-4">
                <Section
                  title={
                    <div className="flex items-center gap-2">
                      <span>Run Summary</span>
                      {runRes.rc === 0 || runRes.rc === null ? (
                        <Badge tone="green">ok</Badge>
                      ) : (
                        <Badge tone="amber">exit {runRes.rc}</Badge>
                      )}
                      {fromLatest && <Badge tone="blue">latest</Badge>}
                    </div>
                  }
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3 border">
                      <div className="text-gray-600">Exit code</div>
                      <div className="font-medium">{runRes.rc ?? "-"}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border">
                      <div className="text-gray-600">Duration</div>
                      <div className="font-medium">
                        {runRes.duration_ms ?? "-"} ms
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border overflow-hidden">
                      <div className="text-gray-600">Run dir</div>
                      <div className="font-mono text-xs truncate">
                        {runRes.run_dir}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border overflow-hidden">
                      <div className="text-gray-600">Output dir</div>
                      <div className="font-mono text-xs truncate">
                        {runRes.output_dir}
                      </div>
                    </div>
                  </div>

                  {latestTime && (
                    <div className="mt-3 text-xs text-gray-600">
                      기준시각:{" "}
                      <span className="font-mono">{formatDate(latestTime)}</span>
                    </div>
                  )}

                  {runRes.command && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Command</div>
                        <Copyable text={runRes.command} />
                      </div>
                      <pre className="text-xs mt-1 p-2 bg-white border rounded-xl overflow-x-auto">
                        {runRes.command}
                      </pre>
                    </div>
                  )}
                </Section>

                {/* Quick Artifacts (outputs/... 경로 대응) */}
                {(artHtml || artCsv || artJson || artLog) && (
                  <Section title="Quick Artifacts">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {artHtml && (
                        <div className="border rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FileText className="w-4 h-4" /> HTML Report
                          </div>
                          <div className="text-xs text-gray-600 mt-1 break-all">
                            {artHtml.path}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {artHtml.download_url && (
                              <ButtonLink href={artHtml.download_url}>
                                <ExternalLink className="w-4 h-4" /> Open
                              </ButtonLink>
                            )}
                            {artHtml.download_url && (
                              <ButtonLink
                                href={artHtml.download_url}
                                downloadName={artHtml.path.split("/").pop()}
                              >
                                <Download className="w-4 h-4" /> Download
                              </ButtonLink>
                            )}
                          </div>
                        </div>
                      )}
                      {artCsv && (
                        <div className="border rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FileSpreadsheet className="w-4 h-4" /> CSV
                          </div>
                          <div className="text-xs text-gray-600 mt-1 break-all">
                            {artCsv.path}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {artCsv.download_url && (
                              <ButtonLink href={artCsv.download_url}>
                                <ExternalLink className="w-4 h-4" /> Open
                              </ButtonLink>
                            )}
                            {artCsv.download_url && (
                              <ButtonLink
                                href={artCsv.download_url}
                                downloadName={artCsv.path.split("/").pop()}
                              >
                                <Download className="w-4 h-4" /> Download
                              </ButtonLink>
                            )}
                          </div>
                        </div>
                      )}
                      {artJson && (
                        <div className="border rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FileJson className="w-4 h-4" /> JSON-OCSF
                          </div>
                          <div className="text-xs text-gray-600 mt-1 break-all">
                            {artJson.path}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {artJson.download_url && (
                              <ButtonLink href={artJson.download_url}>
                                <ExternalLink className="w-4 h-4" /> Open
                              </ButtonLink>
                            )}
                            {artJson.download_url && (
                              <ButtonLink
                                href={artJson.download_url}
                                downloadName={artJson.path.split("/").pop()}
                              >
                                <Download className="w-4 h-4" /> Download
                              </ButtonLink>
                            )}
                          </div>
                        </div>
                      )}
                      {artLog && (
                        <div className="border rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Terminal className="w-4 h-4" /> log.txt
                          </div>
                          <div className="text-xs text-gray-600 mt-1 break-all">
                            {artLog.path}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {artLog.download_url && (
                              <ButtonLink href={artLog.download_url}>
                                <ExternalLink className="w-4 h-4" /> Open
                              </ButtonLink>
                            )}
                            {artLog.download_url && (
                              <ButtonLink
                                href={artLog.download_url}
                                downloadName={artLog.path.split("/").pop()}
                              >
                                <Download className="w-4 h-4" /> Download
                              </ButtonLink>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                {/* STDOUT / STDERR */}
                <Collapsible
                  title="STDOUT"
                  right={
                    runRes.stdout ? (
                      <Copyable text={stripAnsi(runRes.stdout)} />
                    ) : null
                  }
                >
                  <pre className="text-xs mt-1 p-2 bg-white border rounded-xl overflow-x-auto whitespace-pre-wrap break-words">
                    {normalizeNewlines(stripAnsi(runRes.stdout || ""))}
                  </pre>
                </Collapsible>

                <Collapsible
                  title="STDERR"
                  right={
                    runRes.stderr ? (
                      <Copyable text={stripAnsi(runRes.stderr)} />
                    ) : null
                  }
                >
                  <pre className="text-xs mt-1 p-2 bg-white border rounded-xl overflow-x-auto whitespace-pre-wrap break-words text-red-600">
                    {normalizeNewlines(stripAnsi(runRes.stderr || ""))}
                  </pre>
                </Collapsible>

                {/* Files table */}
                {Array.isArray(runRes.files) && runRes.files.length > 0 && (
                  <Collapsible title="Generated files" defaultOpen>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left">
                            <th className="py-1 pr-4">Path</th>
                            <th className="py-1 pr-4">Size</th>
                            <th className="py-1 pr-4">mtime</th>
                            <th className="py-1">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runRes.files.map((f, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="py-1 pr-4 max-w-[520px]">
                                <code className="break-all">{f.path}</code>
                              </td>
                              <td className="py-1 pr-4">{formatBytes(f.size)}</td>
                              <td className="py-1 pr-4">{formatDate(f.mtime)}</td>
                              <td className="py-1">
                                <div className="flex flex-wrap gap-2">
                                  {f.download_url ? (
                                    <ButtonLink href={f.download_url}>
                                      <ExternalLink className="w-4 h-4" /> Open
                                    </ButtonLink>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                  {f.download_url ? (
                                    <ButtonLink
                                      href={f.download_url}
                                      downloadName={f.path.split("/").pop()}
                                    >
                                      <Download className="w-4 h-4" /> Download
                                    </ButtonLink>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      파일은 서버 내부 <code>{runRes.output_dir}</code> 하위에 생성됩니다.
                    </div>
                  </Collapsible>
                )}

                {/* Preinstall details */}
                {runRes.preinstall && (
                  <Collapsible title="Pre-run installation details">
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
                          pip cmd:{" "}
                          <code>{runRes.preinstall.pip_log.cmd}</code>
                        </div>
                        <pre className="text-xs mt-2 p-2 bg-white border rounded-xl overflow-x-auto">
                          {runRes.preinstall.pip_log.stdout}
                        </pre>
                        {runRes.preinstall.pip_log.stderr && (
                          <pre className="text-xs mt-2 p-2 bg-white border rounded-xl overflow-x-auto text-red-600">
                            {runRes.preinstall.pip_log.stderr}
                          </pre>
                        )}
                      </>
                    )}
                  </Collapsible>
                )}
              </div>
            )}

            {/* Summary from live stream */}
            {summary && (
              <Section title="Live Summary (from stream)">
                <div className="text-xs text-gray-700 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-gray-600">Run dir</div>
                    <div className="font-mono">{summary.run_dir}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Output dir</div>
                    <div className="font-mono">{summary.output_dir}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Duration</div>
                    <div>{summary.duration_ms} ms</div>
                  </div>
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
                            <td className="py-1 pr-4">{formatBytes(f.size)}</td>
                            <td className="py-1">{formatDate(f.mtime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            )}

            {Array.isArray(detail?.detail?.cli_examples) &&
              detail.detail.cli_examples.length > 0 && (
                <Section title="CLI Examples">
                  <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                    {detail.detail.cli_examples.map((ex, i) => (
                      <li key={i}>
                        <code className="px-1 py-0.5 rounded bg-gray-100">{ex}</code>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
