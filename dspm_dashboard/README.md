# SAGE-FRONT

데이터 보안 포스처 관리(DSPM) 대시보드의 프론트엔드 애플리케이션입니다.

## 기술 스택

- **React** - UI 라이브러리
- **JavaScript** - 프로그래밍 언어
- **Tailwind CSS** - 스타일링
- **Recharts** - 데이터 시각화
- **Lucide React** - 아이콘

## 주요 기능

- **Data Target**: 데이터 리소스 목록 및 관리
- **Aegis Results**: 개인정보 탐지 결과 확인
- **Policies**: 정책 준수 상태 확인
- **Lineage**: 데이터 흐름 시각화
- **Threat Compliance**: 위협 및 컴플라이언스 감사
- **Opensource**: 오픈소스 컴플라이언스 관리

## Project Structure
```
dspm_dashboard/
├── public/
│   ├── env-config.js            # 런타임 환경 설정
│   └── index.html
├── src/
│   ├── assets/                  # 정적 자산
│   │   ├── aws-icons/           # AWS 서비스 아이콘
│   │   └── oss/                 # 오픈소스 관련 자산
│   ├── components/              # 재사용 가능한 UI 컴포넌트
│   │   ├── DataTarget/          # 데이터 타겟 컴포넌트
│   │   ├── cards/               # 카드 컴포넌트
│   │   ├── charts/              # 차트 컴포넌트
│   │   └── navigation/          # 네비게이션 컴포넌트
│   ├── config/
│   │   ├── api.js               # API 엔드포인트 설정
│   │   └── runtimeEnv.js        # 런타임 환경 변수
│   ├── data/                    # 정적 데이터
│   │   ├── complianceScores.js
│   │   ├── dataClassification.js
│   │   ├── issuesBySeverity.js
│   │   └── index.js
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useDataTarget.js     # 데이터 타겟 훅
│   │   └── useLineage.js        # 라인리지 훅
│   ├── pages/                   # 페이지 컴포넌트
│   │   ├── Overview.js          # 대시보드 개요
│   │   ├── DataTarget.js        # 데이터 타겟 관리
│   │   ├── AegisResults.js      # Aegis 탐지 결과
│   │   ├── Alerts.js            # 보안 알림
│   │   ├── Policies.js          # 정책 관리
│   │   ├── Policies2.js         # 정책 관리 v2
│   │   ├── Lineage.js           # 데이터 라인리지
│   │   ├── ThreatCompliance.js  # 위협 컴플라이언스
│   │   ├── ThreatComplianceDetail.js
│   │   ├── Opensource.js        # 오픈소스 관리
│   │   ├── OpensourceDetail.js
│   │   └── OssEvidence.js       # OSS 증적
│   ├── services/                # API 서비스
│   │   ├── aegisApi.js          # Aegis API
│   │   ├── complianceApi.js     # Compliance API
│   │   ├── evidenceApi.js       # Evidence API
│   │   ├── lineageApi.js        # Lineage API
│   │   ├── ossApi.js            # OSS API
│   │   └── sessionService.js    # 세션 관리
│   ├── App.js                   # 메인 앱 컴포넌트
│   └── index.js                 # 앱 진입점
├── docker-entrypoint.sh         # Docker 시작 스크립트
├── docker-stop.sh               # Docker 종료 스크립트
├── Dockerfile                   # Docker 이미지 빌드
├── nginx.conf                   # NGINX 설정
├── package.json
├── postcss.config.js
└── tailwind.config.js
```

## 시작하기

### 사전 준비

**Node.js**와 **npm**이 설치되어 있어야 합니다.
- Node.js 16 이상
- npm

bash
node -v
npm -v

### 설치
```bash
# 저장소 클론
git clone https://github.com/BOB-DSPM/SAGE-FRONT.git
cd SAGE-FRONT/dspm_dashboard

# 의존성 설치
npm install
```

### 대시보드 실행
npm start

http://localhost:3000 에서 실행

---

## Docker 및 AWS Marketplace 가이드

AWS Marketplace 컨테이너 요구 사항(보안 정책, 고객 데이터/사용 지침, 비루트 실행 등)에 맞추기 위해 다음과 같은 구성을 제공합니다.

- **런타임 환경 변수 기반 설정**: `public/env-config.js`와 `docker-entrypoint.sh`가 컨테이너 시작 시 `REACT_APP_*` 환경 변수를 읽어 프런트엔드가 참조하는 설정 파일을 생성합니다. 빌드 타임 주입 없이 `docker run -e ...`만으로 엔드포인트를 바꿀 수 있습니다.
- **비루트 실행**: NGINX 단계에서 `/usr/share/nginx/html` 등 필요한 경로의 소유권을 `nginx` 사용자에게 위임하고, 기본 포트를 8080으로 조정한 뒤 `USER nginx` 상태로 컨테이너를 실행합니다.
- **정적 자격 증명 제거**: 코드베이스에 API 키/비밀번호를 포함하지 않으며, 런타임 값은 배포 환경에서 환경 변수 혹은 외부 비밀 관리자를 통해 주입하도록 구성되어 있습니다.
- **셀프 서비스 배포**: 아래 절차만 따르면 외부 의존성 승인 없이 누구나 이미지를 빌드/실행할 수 있습니다.

### 빌드

```bash
cd dspm_dashboard
docker build -t dspm-dashboard .
```

기본적으로 소스 코드에 정의된 `localhost`/기본 포트가 사용됩니다. 특정 환경을 위한 API 주소가 필요하다면 빌드 전 `.env` 파일을 수정하거나 `Dockerfile`을 일시적으로 편집해도 됩니다.

### 로컬 실행

```bash
docker run -d --name dspm-dashboard \
  -p 8080:8080 \
  dspm-dashboard
```

필요한 API 엔드포인트는 컨테이너 실행 시 환경 변수로 전달합니다. 예)

```bash
docker run -d --name dspm-dashboard \
  -p 8080:8080 \
  -e REACT_APP_API_HOST=api.example.com \
  -e REACT_APP_AEGIS_API_BASE=http://api.example.com:9000 \
  -e REACT_APP_COLLECTOR_API_BASE=http://api.example.com:8000 \
  -e REACT_APP_OSS_WORKDIR=/data/work \
  dspm-dashboard
```

NGINX는 8080 포트에서 비루트로 동작하므로, 외부에 80/TLS 포트를 노출하려면 로드밸런서나 리버스 프록시에서 포트 매핑을 구성하면 됩니다.

### Docker Hub 배포

이미지를 Docker Hub(예: `comnyang/sage-front`)로 푸시하는 기본 흐름은 아래와 같습니다.

```bash
# 1. Hub 로그인
docker login -u <아이디>

# 2. 로컬 이미지에 리포지토리 태그 부여
docker tag dspm-dashboard comnyang/sage-front:latest

# 3. 푸시
docker push comnyang/sage-front:latest
```

버전 관리를 위해 `comnyang/sage-front:v1.0.0`처럼 추가 태그를 붙여 함께 푸시해도 됩니다.

### AWS Marketplace 배포 체크리스트

1. **이미지 스캔**: Amazon ECR로 푸시한 후 ECR 이미지 스캔을 활성화해 알려진 취약성이 없는지 확인합니다.
2. **비밀 분리**: 고객 환경에서 필요한 자격 증명은 AWS Secrets Manager 또는 Kubernetes `Secret` 등을 사용해 주입하고, README/사용 지침에 해당 절차를 명시합니다.
3. **배포 문서화**: AWS Marketplace 사용 지침에는 위 빌드·실행 명령, 필요한 `REACT_APP_*` 목록, 외부 종속성(예: API 엔드포인트 접근 권한)을 포함해야 합니다.
4. **플랫폼 호환성**: 이미지는 Linux 컨테이너로 빌드되며 Amazon ECS/EKS/Fargate에서 바로 실행할 수 있습니다. 필요 시 Helm 차트나 CloudFormation 템플릿으로 패키징하여 고객이 셀프 서비스로 배포하도록 지원합니다.

위 체크리스트를 따르면 AWS Marketplace 판매자 설명서의 컨테이너 기반 제품 요구 사항을 충족하는 빌드/배포 파이프라인을 구성할 수 있습니다.
