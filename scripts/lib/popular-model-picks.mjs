/**
 * Curated popular / latest / upcoming retail models per topic for `model-deep-dive` profile.
 * Covers every PRODUCT_TOPICS id — tech, 가전, 주방, 계절, IT peripherals.
 * Picks rotate via state.modelPickHistory to avoid back-to-back duplicates.
 */

/** @typedef {{ id: string, brand: string, name: string, nameKo: string, tier?: string, score?: number, genYear?: number, why?: string }} ModelEntry */

/** @type {Record<string, ModelEntry[]>} */
export const MODEL_CATALOG = {
  // ── 대형 가전 ──
  television: [
    { id: "lg-g5-oled", brand: "LG", name: "G5 OLED evo", nameKo: "LG G5 OLED evo", tier: "flagship", score: 96, why: "2025 flagship OLED with brighter evo panel" },
    { id: "samsung-s95f", brand: "Samsung", name: "S95F QD-OLED", nameKo: "삼성 S95F QD-OLED", tier: "flagship", score: 94, why: "QD-OLED bright-room reference" },
    { id: "lg-c4-oled", brand: "LG", name: "C4 OLED", nameKo: "LG C4 OLED", tier: "popular", score: 91, why: "mid-tier OLED sweet spot still selling strong" },
    { id: "tcl-qm851g", brand: "TCL", name: "QM851G Mini-LED", nameKo: "TCL QM851G 미니LED", tier: "value", score: 88, why: "bright mini-LED value leader" },
    { id: "sony-bravia-9", brand: "Sony", name: "BRAVIA 9 Mini LED", nameKo: "소니 브라비아 9", tier: "flagship", score: 93, why: "Sony flagship mini-LED cinema tuning" },
  ],
  refrigerators: [
    { id: "samsung-bespoke-4door", brand: "Samsung", name: "Bespoke 4-Door RF29BB8600", nameKo: "삼성 비스포크 4도어", tier: "flagship", score: 92, why: "flex zone and Family Hub trendsetter" },
    { id: "lg-instaview", brand: "LG", name: "InstaView Door-in-Door LRMVS3006S", nameKo: "LG 인스타뷰 도어인도어", tier: "popular", score: 90, why: "knock-to-view glass door staple" },
    { id: "whirlpool-french", brand: "Whirlpool", name: "French Door WRX735SDHZ", nameKo: "월풀 프렌치도어", tier: "popular", score: 85, why: "mainstream capacity per dollar" },
    { id: "ge-profile-pvd28", brand: "GE", name: "Profile PVD28BYNFS", nameKo: "GE 프로필 PVD28", tier: "popular", score: 84, why: "hands-free autofill niche" },
    { id: "lg-kimchi-specialty", brand: "LG", name: "Kimchi Specialist LKIM08121", nameKo: "LG 김치냉장고", tier: "popular", score: 87, why: "Korean household kimchi storage leader" },
  ],
  "washing-machines": [
    { id: "lg-wm4000", brand: "LG", name: "WM4000HWA", nameKo: "LG WM4000", tier: "popular", score: 91, why: "AI DD motor and steam cycles bestseller" },
    { id: "samsung-ww9000", brand: "Samsung", name: "WW9000B Bespoke AI", nameKo: "삼성 WW9000 비스포크 AI", tier: "flagship", score: 93, why: "2025 AI wash pattern learning" },
    { id: "electrolux-elfw7637", brand: "Electrolux", name: "ELFW7637AT", nameKo: "일렉트로룩스 ELFW7637", tier: "popular", score: 88, why: "LuxCare wash motion value" },
    { id: "bosch-800-washer", brand: "Bosch", name: "800 Series WGX104AWUC", nameKo: "보쉬 800 시리즈", tier: "flagship", score: 90, why: "quiet European front-load reference" },
    { id: "miele-wwi860", brand: "Miele", name: "WWI860 WCS", nameKo: "밀레 WWI860", tier: "flagship", score: 89, why: "20-year tested longevity pitch" },
  ],
  "clothes-dryers": [
    { id: "lg-dlex4000", brand: "LG", name: "DLEX4000W Heat Pump", nameKo: "LG DLEX4000 히트펌프", tier: "flagship", score: 92, why: "energy-efficient heat pump trend" },
    { id: "samsung-dv45t6000", brand: "Samsung", name: "DV45T6000EW", nameKo: "삼성 DV45T6000", tier: "popular", score: 86, why: "Steam Sanitize+ mainstream pick" },
    { id: "miele-twi780", brand: "Miele", name: "TWI780WP", nameKo: "밀레 TWI780", tier: "flagship", score: 90, why: "premium condenser dryer" },
    { id: "bosch-wtg86403", brand: "Bosch", name: "WTG86403UC 300 Series", nameKo: "보쉬 WTG86403", tier: "popular", score: 85, why: "compact ventless option" },
    { id: "whirlpool-wed8120", brand: "Whirlpool", name: "WED8120HW", nameKo: "월풀 WED8120", tier: "value", score: 82, why: "large drum budget vented" },
  ],

  // ── 계절 · 냉방 ──
  "portable-ac": [
    { id: "delonghi-pinguino", brand: "De'Longhi", name: "Pinguino Deluxe 14,000 BTU", nameKo: "드롱기 핑귀노 디럭스", tier: "popular", score: 88, why: "dual-hose efficiency leader" },
    { id: "black-decker-bppt14", brand: "Black+Decker", name: "BPPT14", nameKo: "블랙앤데커 BPPT14", tier: "value", score: 80, why: "renter budget hose unit" },
    { id: "midea-map14hs1", brand: "Midea", name: "MAP14HS1TBL", nameKo: "미디어 MAP14HS1", tier: "popular", score: 86, why: "smart app portable with heat" },
    { id: "lg-lp1419ivsm", brand: "LG", name: "LP1419IVSM Dual Inverter", nameKo: "LG 듀얼 인버터 포터블", tier: "popular", score: 87, why: "quieter inverter portable" },
  ],
  "window-ac": [
    { id: "midea-u-shaped", brand: "Midea", name: "U-Shaped MAW12V1QWT", nameKo: "미디어 U자형 MAW12V1QWT", tier: "popular", score: 93, why: "quiet U-shaped install revolution" },
    { id: "frigidaire-ffra1222u1", brand: "Frigidaire", name: "FFRA1222U1", nameKo: "프리지다어 FFRA1222U1", tier: "value", score: 82, why: "common 12k BTU apartment pick" },
    { id: "lg-lw1217ersm", brand: "LG", name: "LW1217ERSM", nameKo: "LG LW1217ERSM", tier: "popular", score: 85, why: "Energy Star window staple" },
    { id: "ge-ahw12dz", brand: "GE", name: "AHW12DZ Smart Window AC", nameKo: "GE 스마트 창문형", tier: "popular", score: 84, why: "Wi-Fi scheduling window unit" },
    { id: "samsung-windfree", brand: "Samsung", name: "WindFree AW12", nameKo: "삼성 윈드프리 AW12", tier: "upcoming", score: 88, why: "wall-mount WindFree line expansion" },
  ],
  "electric-fans": [
    { id: "dyson-am07", brand: "Dyson", name: "AM07 Tower Fan", nameKo: "다이슨 AM07", tier: "flagship", score: 90, why: "bladeless airflow premium" },
    { id: "xiaomi-smart-fan-2", brand: "Xiaomi", name: "Smart Standing Fan 2", nameKo: "샤오미 스마트 선풍기 2", tier: "popular", score: 86, why: "app control value leader" },
    { id: "honeywell-hyf290b", brand: "Honeywell", name: "HYF290B QuietSet", nameKo: "하니웰 QuietSet", tier: "popular", score: 84, why: "bedroom quiet tower" },
    { id: "vornado-630", brand: "Vornado", name: "630 Mid-Size", nameKo: "보나도 630", tier: "value", score: 82, why: "whole-room vortex circulation" },
    { id: "dyson-purifier-cool", brand: "Dyson", name: "Purifier Cool TP09", nameKo: "다이슨 퓨리파이어 쿨 TP09", tier: "flagship", score: 88, why: "fan + HEPA combo summer pick" },
  ],
  dehumidifiers: [
    { id: "frigidaire-ffap5033", brand: "Frigidaire", name: "FFAP5033W1", nameKo: "프리지다어 FFAP5033", tier: "popular", score: 90, why: "50-pint pump model humid summer" },
    { id: "homelabs-hme020031", brand: "hOmeLabs", name: "HME020031N 50 Pint", nameKo: "홈랩스 50파인트", tier: "value", score: 85, why: "basement value workhorse" },
    { id: "midea-mad50c1", brand: "Midea", name: "MAD50C1ZWS", nameKo: "미디어 MAD50C1", tier: "popular", score: 87, why: "smart bucket alert" },
    { id: "ge-apwr50yl", brand: "GE", name: "APWR50YL", nameKo: "GE APWR50YL", tier: "popular", score: 84, why: "garage humidity staple" },
  ],

  // ── 청소 · 공기 ──
  "robot-vacuums": [
    { id: "roborock-saros-z70", brand: "Roborock", name: "Saros Z70", nameKo: "로보락 사로스 Z70", tier: "upcoming", score: 96, why: "2025 flagship with mechanical arm hype" },
    { id: "dreame-x50-ultra", brand: "Dreame", name: "X50 Ultra", nameKo: "드리미 X50 울트라", tier: "flagship", score: 94, why: "mop extend and lift competition" },
    { id: "roborock-s8-pro-ultra", brand: "Roborock", name: "S8 Pro Ultra", nameKo: "로보락 S8 Pro Ultra", tier: "popular", score: 91, why: "auto-wash dock bestseller" },
    { id: "roomba-j9-plus", brand: "iRobot", name: "Roomba j9+", nameKo: "룸바 j9+", tier: "popular", score: 86, why: "carpet pet-hair loyalists" },
    { id: "ecovacs-deebot-x8", brand: "Ecovacs", name: "DEEBOT X8 PRO OMNI", nameKo: "에코백스 X8 PRO OMNI", tier: "flagship", score: 89, why: "OMNI station all-in-one" },
  ],
  "cordless-vacuums": [
    { id: "dyson-v15-detect", brand: "Dyson", name: "V15 Detect", nameKo: "다이슨 V15 디텍트", tier: "flagship", score: 94, why: "laser dust detect reference" },
    { id: "samsung-bespoke-jet-ai", brand: "Samsung", name: "Bespoke Jet AI Ultra", nameKo: "삼성 비스포크 제트 AI", tier: "flagship", score: 91, why: "AI suction auto-adjust" },
    { id: "shark-stratos-iz862", brand: "Shark", name: "Stratos IZ862H", nameKo: "샤크 스트라토스", tier: "popular", score: 88, why: "CleanSense dirt detect value" },
    { id: "tineco-floor-one-s7", brand: "Tineco", name: "Floor One S7 Steam", nameKo: "틴코 Floor One S7", tier: "popular", score: 86, why: "wet-dry floor washer crossover" },
    { id: "dyson-gen5detect", brand: "Dyson", name: "Gen5detect", nameKo: "다이슨 Gen5detect", tier: "flagship", score: 93, why: "HEPA whole-machine seal flagship" },
  ],
  "air-purifiers": [
    { id: "dyson-purifier-big-quiet", brand: "Dyson", name: "Purifier Big+Quiet Formaldehyde", nameKo: "다이슨 빅+콰이엇", tier: "flagship", score: 92, why: "large room formaldehyde sensor" },
    { id: "coway-ap-1512hh", brand: "Coway", name: "AP-1512HH Mighty", nameKo: "코웨이 AP-1512HH", tier: "popular", score: 90, why: "compact HEPA apartment staple" },
    { id: "blueair-311i-max", brand: "Blueair", name: "311i Max", nameKo: "블루에어 311i Max", tier: "popular", score: 88, why: "quiet bedroom HEPASilent" },
    { id: "levoit-core-600s", brand: "Levoit", name: "Core 600S", nameKo: "레보이트 Core 600S", tier: "popular", score: 87, why: "large room smart purifier" },
    { id: "winix-5500-2", brand: "Winix", name: "5500-2", nameKo: "위닉스 5500-2", tier: "value", score: 85, why: "plasma wave value classic" },
  ],
  bidets: [
    { id: "toto-washlet-c2", brand: "TOTO", name: "Washlet C2", nameKo: "토토 워시렛 C2", tier: "popular", score: 91, why: "entry TOTO ewater+ standard" },
    { id: "bio-bidet-bb-2000", brand: "Bio Bidet", name: "BB-2000 Bliss", nameKo: "바이오비데 BB-2000", tier: "popular", score: 88, why: "oscillating nozzle crowd favorite" },
    { id: "kohler-purewash-e750", brand: "Kohler", name: "PureWash E750", nameKo: "코울러 PureWash E750", tier: "flagship", score: 87, why: "integrated dryer premium" },
    { id: "brondell-swash-1400", brand: "Brondell", name: "Swash 1400", nameKo: "브론델 Swash 1400", tier: "popular", score: 85, why: "dual stainless nozzles mid-tier" },
    { id: "coway-bidet-ba-16", brand: "Coway", name: "BA-16", nameKo: "코웨이 BA-16", tier: "popular", score: 86, why: "Korean market bidet seat leader" },
  ],
  "water-purifiers": [
    { id: "coway-aquamega-200c", brand: "Coway", name: "Aquamega 200C", nameKo: "코웨이 아쿠아메가 200C", tier: "popular", score: 90, why: "countertop RO compact" },
    { id: "brita-hub", brand: "Brita", name: "Hub Countertop", nameKo: "브리타 허브", tier: "popular", score: 86, why: "subscription filter countertop" },
    { id: "aquasana-claryum", brand: "Aquasana", name: "Claryum 3-Stage", nameKo: "아쿠아사나 클라리움", tier: "popular", score: 85, why: "under-sink no-waste RO alternative" },
    { id: "lg-puricare-up", brand: "LG", name: "PuriCare UP 2.0", nameKo: "LG 퓨리케어 UP 2.0", tier: "flagship", score: 89, why: "direct water purifier Korean staple" },
    { id: "waterdrop-g3p800", brand: "Waterdrop", name: "G3P800 Tankless RO", nameKo: "워터드롭 G3P800", tier: "value", score: 84, why: "tankless RO value trend" },
  ],

  // ── 주방 ──
  "air-fryers": [
    { id: "ninja-foodi-dual-zone", brand: "Ninja", name: "Foodi Dual Zone DZ401", nameKo: "닌자 푸디 듀얼존", tier: "popular", score: 92, why: "two-basket simultaneous cooking hit" },
    { id: "ninja-af101", brand: "Ninja", name: "AF101 4Qt", nameKo: "닌자 AF101", tier: "popular", score: 88, why: "compact bestseller" },
    { id: "cosori-turbo-blaze", brand: "Cosori", name: "Turbo Blaze 6Qt", nameKo: "코소리 터보 블레이즈", tier: "popular", score: 87, why: "app recipes and even heating" },
    { id: "philips-3000-series", brand: "Philips", name: "3000 Series XXL", nameKo: "필립스 3000 시리즈", tier: "popular", score: 85, why: "Rapid Air European classic" },
    { id: "instant-vortex-plus", brand: "Instant", name: "Vortex Plus 6Qt", nameKo: "인스턴트 Vortex Plus", tier: "value", score: 83, why: "Instant Pot brand crossover" },
  ],
  "rice-cookers": [
    { id: "cuckoo-crp-st1010", brand: "Cuckoo", name: "CRP-ST1010FW", nameKo: "쿠쿠 CRP-ST1010", tier: "flagship", score: 93, why: "IH pressure Korean rice gold standard" },
    { id: "zojirushi-ns-zcc10", brand: "Zojirushi", name: "NS-ZCC10 Neuro Fuzzy", nameKo: "조지루시 NS-ZCC10", tier: "popular", score: 90, why: "Neuro Fuzzy worldwide staple" },
    { id: "tiger-jbx-b10u", brand: "Tiger", name: "JBX-B10U Micom", nameKo: "타이거 JBX-B10U", tier: "popular", score: 86, why: "tacook steam tray feature" },
    { id: "panasonic-sr-df181", brand: "Panasonic", name: "SR-DF181", nameKo: "파나소닉 SR-DF181", tier: "value", score: 82, why: "budget fuzzy logic" },
    { id: "cuckoo-crp-p1009", brand: "Cuckoo", name: "CRP-P1009SW", nameKo: "쿠쿠 CRP-P1009", tier: "popular", score: 88, why: "pressure rice cake mode" },
  ],
  "coffee-machines": [
    { id: "breville-barista-express", brand: "Breville", name: "Barista Express Impress", nameKo: "브레빌 바리스타 익스프레스", tier: "flagship", score: 93, why: "integrated grinder home barista" },
    { id: "breville-bambino", brand: "Breville", name: "Bambino Plus", nameKo: "브레빌 밤비노 플러스", tier: "popular", score: 89, why: "compact 3-second heat" },
    { id: "delonghi-dedica", brand: "De'Longhi", name: "Dedica Style EC685", nameKo: "드롱기 데디카 EC685", tier: "value", score: 84, why: "slim 15cm counter machine" },
    { id: "nespresso-vertuo-pop", brand: "Nespresso", name: "Vertuo Pop+", nameKo: "네스프레소 버츄오 팝+", tier: "popular", score: 86, why: "capsule convenience leader" },
    { id: "jura-e8", brand: "Jura", name: "E8 Piano Black", nameKo: "유라 E8", tier: "flagship", score: 91, why: "fully automatic milk system" },
  ],
  "induction-cooktops": [
    { id: "bosch-nit8069", brand: "Bosch", name: "NIT8069UC 800 Series", nameKo: "보쉬 NIT8069", tier: "flagship", score: 90, why: "FlexInduction bridge zones" },
    { id: "samsung-nz36k7570", brand: "Samsung", name: "NZ36K7570RG", nameKo: "삼성 NZ36K7570", tier: "popular", score: 87, why: "virtual flame visual feedback" },
    { id: "ge-profile-php9036", brand: "GE", name: "Profile PHP9036", nameKo: "GE 프로필 PHP9036", tier: "popular", score: 85, why: "sous vide probe ready" },
    { id: "duxtop-9600ls", brand: "Duxtop", name: "9600LS Portable", nameKo: "덕스탑 9600LS", tier: "value", score: 83, why: "renter portable induction" },
    { id: "lg-lce3010sb", brand: "LG", name: "LCE3010SB Slide-In", nameKo: "LG LCE3010", tier: "popular", score: 86, why: "Air Fry induction range combo" },
  ],
  dishwashers: [
    { id: "bosch-shpm88z", brand: "Bosch", name: "800 Series SHPM88Z75N", nameKo: "보쉬 800 시리즈", tier: "flagship", score: 92, why: "CrystalDry zeolite drying" },
    { id: "miele-g7366", brand: "Miele", name: "G 7366 SCVi AutoDos", nameKo: "밀레 G 7366", tier: "flagship", score: 94, why: "AutoDos and knock-to-open" },
    { id: "kitchenaid-kdte334", brand: "KitchenAid", name: "KDTE334KPS", nameKo: "키친에이드 KDTE334", tier: "popular", score: 87, why: "third rack adjustable" },
    { id: "frigidaire-fdph4316", brand: "Frigidaire", name: "Gallery FDPH4316AS", nameKo: "프리지다어 갤러리", tier: "value", score: 84, why: "budget 44 dBA quiet" },
    { id: "samsung-dw80b707", brand: "Samsung", name: "DW80B7070US", nameKo: "삼성 DW80B7070", tier: "popular", score: 86, why: "WaterWall linear wash" },
  ],

  // ── 계절 · 난방·가습 ──
  humidifiers: [
    { id: "levoit-classic-300s", brand: "Levoit", name: "Classic 300S", nameKo: "레보이트 클래식 300S", tier: "popular", score: 90, why: "smart ultrasonic bedroom" },
    { id: "dyson-am10", brand: "Dyson", name: "AM10 Humidifier", nameKo: "다이슨 AM10", tier: "flagship", score: 88, why: "UV cleanse premium humidify" },
    { id: "honeywell-hcm350", brand: "Honeywell", name: "HCM-350 Germ Free", nameKo: "하니웰 HCM-350", tier: "popular", score: 86, why: "evaporative no white dust" },
    { id: "vornado-evdc300", brand: "Vornado", name: "EVDC300", nameKo: "보나도 EVDC300", tier: "popular", score: 85, why: "whole-room evaporative" },
    { id: "canopy-humidifier", brand: "Canopy", name: "Bedside Humidifier 2.0", nameKo: "캐노피 베드사이드 2.0", tier: "upcoming", score: 87, why: "anti-mold bedside trend" },
  ],
  "space-heaters": [
    { id: "dyson-hp07", brand: "Dyson", name: "Hot+Cool HP07 Purifier", nameKo: "다이슨 HP07", tier: "flagship", score: 90, why: "heat + purify year-round" },
    { id: "delonghi-trd40615", brand: "De'Longhi", name: "TRD40615T Oil-Filled", nameKo: "드롱기 TRD40615", tier: "popular", score: 87, why: "silent oil radiator classic" },
    { id: "lasko-755320", brand: "Lasko", name: "755320 Ceramic Tower", nameKo: "라스코 755320", tier: "value", score: 83, why: "budget ceramic tower" },
    { id: "dr-infrared-dr968", brand: "Dr. Infrared", name: "DR-968 Infrared", nameKo: "Dr. Infrared DR-968", tier: "popular", score: 85, why: "large room infrared" },
    { id: "dreo-solaris-718", brand: "Dreo", name: "Solaris 718 Space Heater", nameKo: "드레오 솔라리스 718", tier: "popular", score: 86, why: "fast ceramic PTC viral pick" },
  ],
  "electric-blankets": [
    { id: "sunbeam-microplush", brand: "Sunbeam", name: "Microplush Heated Blanket", nameKo: "선빔 마이크로플러시", tier: "popular", score: 88, why: "10 heat settings staple" },
    { id: "beautyrest-heated-pad", brand: "Beautyrest", name: "Heated Mattress Pad", nameKo: "뷰티레스트 전기 매트", tier: "popular", score: 86, why: "under-sheet even heat" },
    { id: "bedsure-electric", brand: "Bedsure", name: "Electric Blanket Queen", nameKo: "베드슈어 전기담요", tier: "value", score: 83, why: "Amazon winter bestseller" },
    { id: "biddeford-comfort-knit", brand: "Biddeford", name: "Comfort Knit Heated", nameKo: "비드포드 컴포트니트", tier: "popular", score: 84, why: "machine washable knit" },
    { id: "ilmood-heated-blanket", brand: "ILMOOD", name: "Carbon Fiber Heated Blanket", nameKo: "일무드 카본 전기담요", tier: "popular", score: 85, why: "Korean market carbon heat trend" },
  ],

  // ── IT / 모바일 ──
  "flagship-smartphones": [
    { id: "galaxy-s26-ultra", brand: "Samsung", name: "Galaxy S26 Ultra", nameKo: "갤럭시 S26 울트라", tier: "flagship", score: 97, genYear: 2026, why: "Mar 2026 Ultra — Snapdragon 8 Elite Gen 5 + dual tele" },
    { id: "iphone-17-pro", brand: "Apple", name: "iPhone 17 Pro", nameKo: "아이폰 17 Pro", tier: "flagship", score: 96, genYear: 2025, why: "current Apple Pro — A19 Pro + 48MP triple Fusion" },
    { id: "pixel-10-pro", brand: "Google", name: "Pixel 10 Pro", nameKo: "픽셀 10 Pro", tier: "flagship", score: 94, genYear: 2025, why: "Tensor G5 computational photo + 7yr updates" },
    { id: "galaxy-z-fold-7", brand: "Samsung", name: "Galaxy Z Fold7", nameKo: "갤럭시 Z 폴드7", tier: "flagship", score: 91, genYear: 2026, why: "current foldable productivity niche" },
    { id: "galaxy-s25-ultra", brand: "Samsung", name: "Galaxy S25 Ultra", nameKo: "갤럭시 S25 울트라", tier: "popular", score: 88, genYear: 2025, why: "previous Ultra — discount / trade-in value lane" },
    { id: "iphone-16-pro", brand: "Apple", name: "iPhone 16 Pro", nameKo: "아이폰 16 Pro", tier: "popular", score: 86, genYear: 2024, why: "previous Pro — ecosystem buyers on a discount" },
  ],
  "budget-smartphones": [
    { id: "galaxy-a56", brand: "Samsung", name: "Galaxy A56 5G", nameKo: "갤럭시 A56 5G", tier: "upcoming", score: 93, why: "2026 mid-range refresh expected" },
    { id: "galaxy-a55", brand: "Samsung", name: "Galaxy A55 5G", nameKo: "갤럭시 A55 5G", tier: "popular", score: 91, why: "4-year update mid-range" },
    { id: "pixel-9a", brand: "Google", name: "Pixel 9a", nameKo: "픽셀 9a", tier: "popular", score: 90, why: "Tensor G4 AI at sub-flagship" },
    { id: "nothing-phone-3a", brand: "Nothing", name: "Phone (3a)", nameKo: "낫싱 폰 (3a)", tier: "popular", score: 88, why: "Glyph design cult following" },
    { id: "redmi-note-14-pro", brand: "Xiaomi", name: "Redmi Note 14 Pro", nameKo: "레드미 노트 14 프로", tier: "value", score: 86, why: "200MP budget camera hype" },
    { id: "moto-g-stylus-5g", brand: "Motorola", name: "Moto G Stylus 5G (2025)", nameKo: "모토 G 스타일러스 5G", tier: "value", score: 84, why: "stylus at budget tier" },
  ],
  "wireless-earbuds": [
    { id: "wf-1000xm5", brand: "Sony", name: "WF-1000XM5", nameKo: "소니 WF-1000XM5", tier: "flagship", score: 94, why: "ANC earbuds benchmark" },
    { id: "airpods-pro-2", brand: "Apple", name: "AirPods Pro (2nd gen)", nameKo: "에어팟 프로 2세대", tier: "popular", score: 93, why: "iOS ecosystem default" },
    { id: "galaxy-buds3-pro", brand: "Samsung", name: "Galaxy Buds3 Pro", nameKo: "갤럭시 버즈3 프로", tier: "popular", score: 90, why: "blade design ANC refresh" },
    { id: "bose-qc-ultra-earbuds", brand: "Bose", name: "QuietComfort Ultra Earbuds", nameKo: "보스 QC 울트라 이어버드", tier: "flagship", score: 89, why: "Immersive Audio comfort" },
    { id: "nothing-ear-3", brand: "Nothing", name: "Ear (3)", nameKo: "낫싱 이어 (3)", tier: "upcoming", score: 87, why: "transparent design refresh buzz" },
  ],
  "noise-cancelling-headphones": [
    { id: "wh-1000xm6", brand: "Sony", name: "WH-1000XM6", nameKo: "소니 WH-1000XM6", tier: "upcoming", score: 96, why: "XM6 launch cycle anticipation" },
    { id: "wh-1000xm5", brand: "Sony", name: "WH-1000XM5", nameKo: "소니 WH-1000XM5", tier: "flagship", score: 93, why: "travel ANC reference" },
    { id: "bose-qc-ultra", brand: "Bose", name: "QuietComfort Ultra Headphones", nameKo: "보스 QC 울트라", tier: "flagship", score: 92, why: "comfort ANC balance" },
    { id: "airpods-max-usb-c", brand: "Apple", name: "AirPods Max (USB-C)", nameKo: "에어팟 맥스 USB-C", tier: "popular", score: 86, why: "spatial audio ecosystem" },
    { id: "sennheiser-momentum-4", brand: "Sennheiser", name: "Momentum 4 Wireless", nameKo: "젠하이저 모멘텀 4", tier: "popular", score: 88, why: "60-hour battery audiophile" },
  ],
  "bluetooth-speakers": [
    { id: "jbl-charge-6", brand: "JBL", name: "Charge 6", nameKo: "JBL 차지 6", tier: "upcoming", score: 92, why: "2026 outdoor speaker refresh" },
    { id: "jbl-charge-5", brand: "JBL", name: "Charge 5", nameKo: "JBL 차지 5", tier: "popular", score: 90, why: "IP67 outdoor staple" },
    { id: "bose-soundlink-flex", brand: "Bose", name: "SoundLink Flex", nameKo: "보스 사운드링크 플렉스", tier: "popular", score: 88, why: "PositionIQ picnic speaker" },
    { id: "sony-xg500", brand: "Sony", name: "SRS-XG500", nameKo: "소니 SRS-XG500", tier: "flagship", score: 86, why: "30-hour party battery" },
    { id: "marshall-emberton-3", brand: "Marshall", name: "Emberton III", nameKo: "마샬 엠버튼 III", tier: "popular", score: 87, why: "retro portable design icon" },
  ],
  "tablet-budget": [
    { id: "ipad-11-a16", brand: "Apple", name: "iPad (11th gen, A16)", nameKo: "아이패드 11세대", tier: "upcoming", score: 93, why: "2026 iPad base refresh rumor" },
    { id: "ipad-10th-gen", brand: "Apple", name: "iPad (10th gen)", nameKo: "아이패드 10세대", tier: "popular", score: 90, why: "iPadOS entry tablet" },
    { id: "galaxy-tab-s10-fe", brand: "Samsung", name: "Galaxy Tab S10 FE", nameKo: "갤럭시 탭 S10 FE", tier: "upcoming", score: 91, why: "S Pen FE value refresh" },
    { id: "galaxy-tab-s9-fe", brand: "Samsung", name: "Galaxy Tab S9 FE", nameKo: "갤럭시 탭 S9 FE", tier: "popular", score: 87, why: "S Pen included mid-tier" },
    { id: "lenovo-tab-p12", brand: "Lenovo", name: "Tab P12", nameKo: "레노버 탭 P12", tier: "value", score: 83, why: "large screen media budget" },
  ],
  "power-banks": [
    { id: "anker-prime-27k", brand: "Anker", name: "Prime 27,650mAh 250W", nameKo: "앤커 프라임 27650", tier: "flagship", score: 94, why: "250W laptop charging flagship" },
    { id: "anker-737", brand: "Anker", name: "737 PowerBank (PowerCore 24K)", nameKo: "앤커 737", tier: "popular", score: 91, why: "140W GaN classic" },
    { id: "baseus-blade-2", brand: "Baseus", name: "Blade 2 100W", nameKo: "베이스어스 블레이드 2", tier: "popular", score: 87, why: "thin high-watt design" },
    { id: "ugreen-nexode-25k", brand: "UGREEN", name: "Nexode 25,000mAh 145W", nameKo: "유그린 넥소드 25000", tier: "popular", score: 86, why: "smart display ports" },
    { id: "samsung-25w-trio", brand: "Samsung", name: "25W Trio Wireless Pack", nameKo: "삼성 25W 트리오", tier: "popular", score: 84, why: "Galaxy ecosystem bundle" },
  ],

  // ── IT / PC ──
  laptops: [
    { id: "macbook-air-m4", brand: "Apple", name: "MacBook Air M4", nameKo: "맥북 에어 M4", tier: "upcoming", score: 95, why: "2026 M4 fanless refresh wave" },
    { id: "macbook-air-m3", brand: "Apple", name: "MacBook Air M3", nameKo: "맥북 에어 M3", tier: "popular", score: 92, why: "fanless daily driver" },
    { id: "dell-xps-14", brand: "Dell", name: "XPS 14 (9440)", nameKo: "델 XPS 14", tier: "flagship", score: 90, why: "OLED ultrabook premium" },
    { id: "thinkpad-x1-carbon-g13", brand: "Lenovo", name: "ThinkPad X1 Carbon Gen 13", nameKo: "씽크패드 X1 카본 Gen 13", tier: "flagship", score: 91, why: "business keyboard legend" },
    { id: "asus-zenbook-s14", brand: "ASUS", name: "Zenbook S 14 OLED", nameKo: "ASUS 젠북 S 14", tier: "popular", score: 88, why: "Lunar Lake efficiency" },
    { id: "lg-gram-17", brand: "LG", name: "gram 17 (2025)", nameKo: "LG 그램 17", tier: "popular", score: 86, why: "ultralight large screen" },
  ],
  "budget-monitors": [
    { id: "dell-u2724d", brand: "Dell", name: "UltraSharp U2724D", nameKo: "델 U2724D", tier: "popular", score: 92, why: "IPS Black 1440p office" },
    { id: "dell-s2721ds", brand: "Dell", name: "S2721DS", nameKo: "델 S2721DS", tier: "popular", score: 89, why: "1440p IPS value staple" },
    { id: "lg-27up850", brand: "LG", name: "27UP850-W", nameKo: "LG 27UP850-W", tier: "popular", score: 87, why: "USB-C hub monitor" },
    { id: "gigabyte-m27q-x", brand: "Gigabyte", name: "M27Q X", nameKo: "기가바이트 M27Q X", tier: "value", score: 86, why: "240Hz 1440p gaming value" },
    { id: "samsung-viewfinity-s8", brand: "Samsung", name: "ViewFinity S8 S80UD", nameKo: "삼성 뷰피니티 S8", tier: "popular", score: 85, why: "4K HDR content creation" },
  ],
  "portable-ssd": [
    { id: "samsung-t9", brand: "Samsung", name: "T9 Portable SSD", nameKo: "삼성 T9", tier: "flagship", score: 93, why: "2000MB/s USB 3.2 Gen2x2" },
    { id: "samsung-t7-shield", brand: "Samsung", name: "T7 Shield", nameKo: "삼성 T7 쉴드", tier: "popular", score: 90, why: "rugged IP65 portable" },
    { id: "sandisk-extreme-pro-v2", brand: "SanDisk", name: "Extreme Pro V2", nameKo: "샌디스크 익스트림 프로 V2", tier: "popular", score: 88, why: "creator 2000MB/s tier" },
    { id: "crucial-x10-pro", brand: "Crucial", name: "X10 Pro", nameKo: "크루셜 X10 Pro", tier: "popular", score: 86, why: "compact high-speed value" },
    { id: "wd-my-passport-ssd", brand: "WD", name: "My Passport SSD", nameKo: "WD 마이패스포트 SSD", tier: "value", score: 84, why: "password hardware encryption" },
  ],
  "usb-c-hubs": [
    { id: "caldigit-ts4", brand: "CalDigit", name: "TS4 Thunderbolt 4 Dock", nameKo: "캘디짓 TS4", tier: "flagship", score: 94, why: "18-port TB4 desk reference" },
    { id: "anker-778-dock", brand: "Anker", name: "778 Thunderbolt Dock", nameKo: "앤커 778 독", tier: "flagship", score: 91, why: "12-in-1 100W charging" },
    { id: "satechi-tb4-dock", brand: "Satechi", name: "Thunderbolt 4 Dock", nameKo: "사테치 썬더볼트4", tier: "popular", score: 88, why: "MacBook desk staple" },
    { id: "baseus-17in1", brand: "Baseus", name: "17-in-1 USB-C Hub", nameKo: "베이스어스 17in1", tier: "value", score: 84, why: "budget multi-port travel" },
    { id: "ugreen-revodok-max", brand: "UGREEN", name: "Revodok Max 213", nameKo: "유그린 Revodok Max", tier: "popular", score: 86, why: "dual HDMI 4K hub" },
  ],
  "mechanical-keyboards": [
    { id: "keychron-q1-pro", brand: "Keychron", name: "Q1 Pro", nameKo: "키크론 Q1 Pro", tier: "popular", score: 91, why: "gasket mount wireless custom" },
    { id: "logitech-g-pro-x-tkl", brand: "Logitech", name: "G Pro X TKL Lightspeed", nameKo: "로지텍 G Pro X TKL", tier: "flagship", score: 90, why: "esports wireless TKL" },
    { id: "razer-blackwidow-v4", brand: "Razer", name: "BlackWidow V4 Pro", nameKo: "레이저 블랙위도우 V4 Pro", tier: "popular", score: 88, why: "command dial gaming" },
    { id: "nuphy-air75-v3", brand: "NuPhy", name: "Air75 V3", nameKo: "누피 에어75 V3", tier: "upcoming", score: 89, why: "low-profile portable hype" },
    { id: "wooting-60he", brand: "Wooting", name: "60HE+", nameKo: "우팅 60HE+", tier: "flagship", score: 92, why: "analog Hall effect gaming" },
  ],
  webcams: [
    { id: "logitech-brio-4k", brand: "Logitech", name: "Brio 4K", nameKo: "로지텍 Brio 4K", tier: "flagship", score: 92, why: "HDR Windows Hello reference" },
    { id: "elgato-facecam-pro", brand: "Elgato", name: "Facecam Pro", nameKo: "엘가토 페이스캠 프로", tier: "flagship", score: 90, why: "4K60 creator streaming" },
    { id: "razer-kiyo-pro-ultra", brand: "Razer", name: "Kiyo Pro Ultra", nameKo: "레이저 키요 프로 울트라", tier: "popular", score: 88, why: "large sensor low light" },
    { id: "obsbot-tiny-4k", brand: "Obsbot", name: "Tiny 4K", nameKo: "옵스봇 Tiny 4K", tier: "popular", score: 87, why: "AI tracking gimbal webcam" },
    { id: "insta360-link-2", brand: "Insta360", name: "Link 2", nameKo: "인스타360 Link 2", tier: "upcoming", score: 89, why: "4K webcam gimbal refresh" },
  ],
  "fitness-trackers": [
    { id: "apple-watch-series-10", brand: "Apple", name: "Apple Watch Series 10", nameKo: "애플 워치 시리즈 10", tier: "flagship", score: 94, why: "health sensors ecosystem" },
    { id: "galaxy-watch-ultra", brand: "Samsung", name: "Galaxy Watch Ultra", nameKo: "갤럭시 워치 울트라", tier: "flagship", score: 92, why: "rugged Android flagship watch" },
    { id: "galaxy-watch-7", brand: "Samsung", name: "Galaxy Watch 7", nameKo: "갤럭시 워치 7", tier: "popular", score: 88, why: "BioActive sensor stack" },
    { id: "fitbit-charge-6", brand: "Fitbit", name: "Charge 6", nameKo: "핏빗 차지 6", tier: "popular", score: 85, why: "band form Google Fit" },
    { id: "garmin-forerunner-965", brand: "Garmin", name: "Forerunner 965", nameKo: "가민 포러너 965", tier: "flagship", score: 90, why: "runner AMOLED GPS" },
  ],
  "gaming-consoles": [
    { id: "switch-2", brand: "Nintendo", name: "Switch 2", nameKo: "닌텐도 스위치 2", tier: "upcoming", score: 97, why: "2025 launch demand explosion" },
    { id: "ps5-pro", brand: "Sony", name: "PlayStation 5 Pro", nameKo: "플레이스테이션 5 프로", tier: "flagship", score: 95, why: "mid-gen 4K ray tracing boost" },
    { id: "ps5-slim", brand: "Sony", name: "PlayStation 5 Slim", nameKo: "PS5 슬림", tier: "popular", score: 91, why: "exclusive titles ecosystem" },
    { id: "xbox-series-x", brand: "Microsoft", name: "Xbox Series X", nameKo: "Xbox 시리즈 X", tier: "popular", score: 89, why: "Game Pass value" },
    { id: "steam-deck-oled", brand: "Valve", name: "Steam Deck OLED", nameKo: "스팀덱 OLED", tier: "popular", score: 88, why: "PC handheld library" },
  ],
  "action-cameras": [
    { id: "gopro-hero-13", brand: "GoPro", name: "HERO13 Black", nameKo: "고프로 HERO13 Black", tier: "flagship", score: 94, why: "HyperSmooth 6.0 action leader" },
    { id: "dji-osmo-action-5", brand: "DJI", name: "Osmo Action 5 Pro", nameKo: "DJI 오즈모 액션 5 Pro", tier: "flagship", score: 93, why: "low-light action sensor" },
    { id: "insta360-ace-pro-2", brand: "Insta360", name: "Ace Pro 2", nameKo: "인스타360 Ace Pro 2", tier: "popular", score: 90, why: "Leica lens co-engineered" },
    { id: "gopro-max-2", brand: "GoPro", name: "Max 2 360", nameKo: "고프로 Max 2", tier: "upcoming", score: 91, why: "360 travel refresh buzz" },
    { id: "dji-osmo-pocket-3", brand: "DJI", name: "Osmo Pocket 3", nameKo: "DJI 오즈모 포켓 3", tier: "popular", score: 89, why: "vlog gimbal pocket cam" },
  ],
  "smart-home-cameras": [
    { id: "google-nest-cam-2025", brand: "Google", name: "Nest Cam (battery, 2025)", nameKo: "구글 네스트 캠 2025", tier: "popular", score: 91, why: "Gemini AI event detection" },
    { id: "ring-stick-up-cam-pro", brand: "Ring", name: "Stick Up Cam Pro", nameKo: "링 Stick Up Cam Pro", tier: "popular", score: 89, why: "3D motion radar" },
    { id: "arlo-pro-5s", brand: "Arlo", name: "Pro 5S 2K", nameKo: "아를로 Pro 5S", tier: "popular", score: 88, why: "color night vision" },
    { id: "reolink-argus-4-pro", brand: "Reolink", name: "Argus 4 Pro", nameKo: "리오링 Argus 4 Pro", tier: "value", score: 86, why: "4K solar no subscription" },
    { id: "eufy-solo-s340", brand: "eufy", name: "SoloCam S340", nameKo: "유피 솔로캠 S340", tier: "popular", score: 87, why: "dual lens 360 local storage" },
  ],
};

export function topicSupportsModelDeepDive(topicId) {
  return Boolean(MODEL_CATALOG[topicId]?.length);
}

export function listModelDeepDiveTopicIds() {
  return Object.keys(MODEL_CATALOG);
}

/**
 * @param {string} topicId
 * @param {{ state?: { modelPickHistory?: Array<{ topicId: string, modelId: string }> } }} [options]
 */
/**
 * Prefer current / last calendar-year flagships so summer–fall drafts do not
 * shortlist two-cycles-old Ultra/Pro phones as "현세대".
 */
function modelFreshnessRank(model, year) {
  const gen = Number(model?.genYear ?? 0);
  if (!gen) return 0;
  if (gen >= year) return 2;
  if (gen >= year - 1) return 1;
  return 0;
}

export function pickPopularModels(topicId, options = {}) {
  const catalog = MODEL_CATALOG[topicId];
  if (!catalog?.length) return null;

  const year = options.year ?? new Date().getFullYear();
  const history = options.state?.modelPickHistory ?? [];
  const recentIds = new Set(
    history
      .filter((e) => e.topicId === topicId)
      .slice(-6)
      .map((e) => e.modelId),
  );

  let pool = catalog.filter((m) => !recentIds.has(m.id));
  if (pool.length === 0) pool = [...catalog];

  // Prefer tier:flagship + recent genYear, then score.
  pool.sort((a, b) => {
    const aFlag = a.tier === "flagship" ? 1 : 0;
    const bFlag = b.tier === "flagship" ? 1 : 0;
    if (bFlag !== aFlag) return bFlag - aFlag;
    const freshDiff =
      modelFreshnessRank(b, year) - modelFreshnessRank(a, year);
    if (freshDiff !== 0) return freshDiff;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const topTier = pool.filter(
    (m) =>
      modelFreshnessRank(m, year) >= 1 &&
      (m.tier === "flagship" || (m.score ?? 0) >= (pool[0]?.score ?? 0) - 5),
  );
  const chooseFrom = topTier.length > 0 ? topTier : pool;
  const primary =
    chooseFrom[Math.floor(Math.random() * Math.min(3, chooseFrom.length))] ??
    pool[0];

  const rival =
    pool.find(
      (m) =>
        m.id !== primary.id &&
        m.brand !== primary.brand &&
        modelFreshnessRank(m, year) >= 1,
    ) ??
    pool.find((m) => m.id !== primary.id && m.brand !== primary.brand) ??
    pool.find((m) => m.id !== primary.id) ??
    null;

  return { primary, rival, topicId };
}

export function recordModelPick(state, topicId, modelId) {
  if (!state || !topicId || !modelId) return;
  state.modelPickHistory = [
    ...(state.modelPickHistory ?? []),
    { topicId, modelId, at: new Date().toISOString() },
  ].slice(-40);
}

export function modelSlugToken(model) {
  return String(model?.id ?? model?.name ?? "model")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
