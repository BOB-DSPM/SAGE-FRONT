# DSPM Dashboard

---

## Project Structure
```
dspm_dashboard/
├── src/
│   ├── assets/                  
│   │   └── # 프로젝트에서 사용하는 이미지, 아이콘 등 정적 자원
│   ├── components/              
│   │   ├── navigation/
│   │   │   └── Sidebar.js       
│   │   │       # 좌측 사이드바 탭 UI를 담당, activeTab prop으로 페이지 전환 제어
│   │   ├── cards/
│   │   │   └── KPI.js           
│   │   │       # KPI 카드 컴포넌트, title, value, color, icon prop으로 재사용 가능
│   │   ├── charts/
│   │   │   ├── PieChartComponent.js
│   │   │   │   # Pie 차트 컴포넌트, data prop으로 데이터 시각화
│   │   │   └── AreaChartComponent.js
│   │   │       # Alerts Trend 차트용 Area 차트 컴포넌트
│   │   └── inventory/
│   │       └── InventoryList.js
│   │           # Inventory 탭 리스트 UI, inventoryData와 loading 상태를 prop으로 받음
│   ├── data/                    
│   │   ├── complianceScores.js
│   │   │   # 정책/컴플라이언스 점수 mock 데이터
│   │   ├── issuesBySeverity.js
│   │   │   # 심각도별 이슈 mock 데이터
│   │   ├── dataClassification.js
│   │   │   # 데이터 타입별 분류 mock 데이터
│   │   └── index.js             
│   │       # 위 3개의 데이터를 한 번에 export
│   ├── hooks/
│   │   └── useInventory.js      
│   │       # Inventory API fetch 커스텀 훅, activeTab에 따라 fetch 수행
│   ├── pages/                   
│   │   ├── Overview.js          
│   │   │   # Overview 탭 페이지, KPI 카드 + Pie차트 + Issues by Severity + Compliance 등 조합
│   │   ├── Inventory.js         
│   │   │   # Inventory 탭 페이지, useInventory 훅과 InventoryList 컴포넌트 사용
│   │   ├── Alerts.js            
│   │   │   # Alerts 탭 페이지, 최근 보안 알림 목록 UI
│   │   ├── Policies.js          
│   │   │   # Policies 탭 페이지, 컴플라이언스 점수 카드 UI
│   │   └── Lineage.js           
│   │       # Lineage 탭 페이지, 데이터 흐름 시각화 UI
│   ├── App.js                   
│   │   # 최상위 Dashboard 페이지, Sidebar와 페이지 렌더링 로직 포함
│   └── index.js                 
│       # React 엔트리 포인트, ReactDOM.render 호출
├── package.json                 
│   # 프로젝트 의존성 및 실행 스크립트
├── tailwind.config.js           
│   # TailwindCSS 설정
└── postcss.config.js            
    # PostCSS 설정
```
---

## 기능

- Overview 탭: 주요 지표(Security Score, Total Assets, Active Alerts, Compliance) 표시
- Inventory 탭: 데이터 리소스 목록
- Alerts 탭: 최근 보안 알림
- Policies 탭: 정책 준수 상태
- Lineage 탭: 데이터 흐름 시각화
- 검색(Search) 및 필터(Filter) 기능
- Recharts 기반 반응형 차트

---

## 기술 스택

- React (Functional Component + Hooks)
- Recharts (BarChart, PieChart, AreaChart 등)
- Lucide React (아이콘)
- Tailwind CSS (스타일링)

---

## 시작하기

### 사전 준비

**Node.js**와 **npm**이 설치되어 있어야 합니다.

bash
node -v
npm -v

### 설치

레포지토리 클론:

git clone <YOUR_REPO_URL>
cd <YOUR_REPO_DIRECTORY>

의존성 설치:

npm install
package.json에 react, recharts, lucide-react, tailwindcss가 포함되어 있어야 합니다.

### 대시보드 실행
npm start

http://localhost:3000 에서 실행
