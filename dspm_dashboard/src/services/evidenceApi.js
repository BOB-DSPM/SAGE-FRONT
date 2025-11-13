// ======================================
// file: src/services/evidenceApi.js
// ======================================
const API_BASE =
  process.env.REACT_APP_OSS_BASE || "http://43.202.228.52:8800/oss";

/**
 * Evidence 관련 API:
 * - getLatestSummary: 선택한 툴들의 최신 실행 요약
 * - getReportUrl: 선택한 툴들로 PDF 생성/다운로드 URL
 */
export const evidenceApi = {
  /**
   * 각 오픈소스 툴별 최신 실행 요약 조회
   *
   * 🔹 백엔드에 /oss/api/evidence/latest 엔드포인트는 없기 때문에
   *    대신 기존 엔드포인트:
   *      GET /oss/api/oss/{code}/runs/latest
   *    를 코드별로 호출해서 요약 정보를 합쳐서 반환한다.
   *
   * 반환 형태:
   * {
   *   tools: {
   *     prowler: {
   *       status: "ok",
   *       run_dir: "...",
   *       output_dir: "...",
   *       rc: 0 또는 null,
   *       file_count: 42
   *     },
   *     custodian: { status: "no_run_found" }, // 404인 경우
   *     ...
   *   }
   * }
   */
  async getLatestSummary(codes) {
    // codes가 없으면 기본 4종
    const codesArr =
      codes && codes.length > 0
        ? codes
        : ["prowler", "custodian", "steampipe", "scout"];

    const tools = {};

    for (const code of codesArr) {
      const url = `${API_BASE}/api/oss/${encodeURIComponent(
        code
      )}/runs/latest`;

      try {
        const res = await fetch(url);

        if (res.status === 404) {
          // 해당 코드로 실행 이력이 없는 경우
          tools[code] = { status: "no_run_found" };
          continue;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          tools[code] = {
            status: "error",
            error: `HTTP ${res.status} ${text || res.statusText}`,
          };
          continue;
        }

        const data = await res.json();

        tools[code] = {
          status: "ok",
          run_dir: data.run_dir ?? null,
          output_dir: data.output_dir ?? null,
          rc:
            data.rc === null || data.rc === undefined
              ? null
              : data.rc,
          file_count: Array.isArray(data.files)
            ? data.files.length
            : null,
        };
      } catch (e) {
        tools[code] = {
          status: "error",
          error: e?.message || "요약 조회 중 예외 발생",
        };
      }
    }

    return { tools };
  },

  /**
   * PDF 증적 보고서 다운로드용 URL 생성
   * 백엔드: GET /oss/api/evidence/report.pdf?codes=...
   * 실제 다운로드는 window.open(...) 등으로 처리.
   */
  getReportUrl(codes) {
    const params = new URLSearchParams();
    if (codes && codes.length > 0) {
      params.set("codes", codes.join(","));
    }
    return `${API_BASE}/api/evidence/report.pdf${
      params.toString() ? `?${params.toString()}` : ""
    }`;
  },
};
