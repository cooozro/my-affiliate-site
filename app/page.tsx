export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6">AI Pick & Report</h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          데이터로 검증된 스마트한 선택. 
          큐레이션 된 상품과 깊이 있는 분석 리포트를 동시에 만나보세요.
        </p>
      </div>

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl">
        {/* 상품 큐레이션 영역 */}
        <div className="md:col-span-2 p-8 border border-gray-200 rounded-2xl shadow-sm bg-white">
          <h2 className="text-2xl font-bold mb-6">최신 큐레이션 아이템</h2>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg hover:border-indigo-500 transition cursor-pointer">
              <h3 className="font-semibold text-lg">AI가 엄선한 가성비 제품 TOP 5</h3>
              <p className="text-gray-500 text-sm">실제 구매 만족도와 스펙을 기반으로 분석한 추천 리스트입니다.</p>
            </div>
            {/* 추가 상품 항목들 */}
          </div>
        </div>

        {/* 정보성 블로그/리포트 영역 */}
        <div className="p-8 border border-gray-200 rounded-2xl shadow-sm bg-white">
          <h2 className="text-2xl font-bold mb-6">인사이트 리포트</h2>
          <ul className="space-y-4 text-gray-600">
            <li><a href="#" className="hover:text-indigo-600">현명한 소비를 위한 가이드</a></li>
            <li><a href="#" className="hover:text-indigo-600">글로벌 시장 트렌드 분석</a></li>
            <li><a href="#" className="hover:text-indigo-600">제품 수명과 가성비 계산법</a></li>
          </ul>
        </div>
      </div>
    </main>
