// ======================================
// file: src/pages/OssEvidence.js
// ======================================
import React, { useEffect, useMemo, useState } from "react";
import { evidenceApi } from "../services/evidenceApi";
import {
  FileText,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";

const DEFAULT_TOOLS = [
  { code: "prowler", name: "Prowler", desc: "AWS 계정·서비스 보안 점검" },
  {
    code: "custodian",
    name: "Cloud Custodian",
    desc: "정책-as-코드 기반 자원 탐지·시정",
  },
  {
    code: "steampipe",
    name: "Steampipe (mods)",
    desc: "Powerpipe benchmark 기반 컴플라이언스 리포트",
  },
  {
    code: "scout",
    name: "Scout Suite",
    desc: "멀티클라우드 구성 평가 HTML 리포트",
  },
];

const OssEvidence = () => {
  const [selectedCodes, setSelectedCodes] = useState(() =>
    new Set(DEFAULT_TOOLS.map((t) => t.code))
  );
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedList = useMemo(
    () => Array.from(selectedCodes),
    [selectedCodes]
  );

  const toggleCode = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCodes(new Set(DEFAULT_TOOLS.map((t) => t.code)));
  };

  const clearAll = () => {
    setSelectedCodes(new Set());
  };

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await evidenceApi.getLatestSummary(selectedList);
      setSummary(res);
    } catch (e) {
      console.error(e);
      setError(e.message || "요약 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (selectedList.length === 0) {
      alert("최소 1개 이상의 오픈소스를 선택해 주세요.");
      return;
    }
    setDownloadLoading(true);
    try {
      const url = evidenceApi.getReportUrl(selectedList);
      // 새 탭/창으로 PDF 열기
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadLoading(false);
    }
  };

  useEffect(() => {
    // 초기 진입 시 한 번 요약 로드
    loadSummary().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toolsSummary = summary?.tools || {};

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              OSS 증적 보고서
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Prowler / Cloud Custodian / Steampipe / Scout Suite 실행 결과를
            선택하여 하나의 PDF 보고서로 다운로드할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            {loading ? "갱신 중..." : "최신 실행 요약 새로고침"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadLoading || selectedList.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloadLoading ? "보고서 생성 중..." : "PDF 증적 보고서 다운로드"}
          </button>
        </div>
      </div>

      {/* 선택 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            포함할 오픈소스 도구 선택
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAll}
              className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            >
              모두 해제
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEFAULT_TOOLS.map((tool) => {
            const checked = selectedCodes.has(tool.code);
            return (
              <button
                key={tool.code}
                type="button"
                onClick={() => toggleCode(tool.code)}
                className={`flex items-start gap-3 w-full rounded-lg border px-3 py-2 text-left transition ${
                  checked
                    ? "border-primary-500 bg-primary-50/80"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="mt-0.5">
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-primary-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {tool.name}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">
                      {tool.code}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{tool.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 최신 실행 요약 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          최신 실행 요약
        </h2>

        {!summary && !loading && (
          <p className="text-sm text-gray-500">
            최초 로딩 중이거나, 아직 실행 이력이 없을 수 있습니다. 필요하면
            상단의 “최신 실행 요약 새로고침” 버튼을 눌러 주세요.
          </p>
        )}

        {summary && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    Tool
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    Run dir
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    Output dir
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    Exit code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                    파일 수
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_TOOLS.map((tool) => {
                  const info = toolsSummary[tool.code];
                  if (!info) {
                    return (
                      <tr key={tool.code} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">
                          {tool.name}
                        </td>
                        <td className="px-3 py-2 text-gray-400" colSpan={5}>
                          요약 데이터 없음
                        </td>
                      </tr>
                    );
                  }

                  if (info.status === "no_run_found") {
                    return (
                      <tr key={tool.code} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">
                          {tool.name}
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          실행 이력 없음
                        </td>
                        <td className="px-3 py-2 text-gray-400" colSpan={4}>
                          -
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={tool.code} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{tool.name}</span>
                          <span className="text-xs text-gray-500">
                            {tool.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600">
                          OK
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-gray-500">
                        {info.run_dir || "-"}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-gray-500">
                        {info.output_dir || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {info.rc === null || info.rc === undefined
                          ? "-"
                          : info.rc}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {typeof info.file_count === "number"
                          ? info.file_count
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OssEvidence;
