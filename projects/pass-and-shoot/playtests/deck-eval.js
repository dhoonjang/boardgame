// 패스 앤 슛 카드 덱 평가기 (제안 C 덱 v1)
// 사용: node playtests/deck-eval.js            통계와 검증 결과
//       node playtests/deck-eval.js --md       카드 목록·수치표를 마크다운으로 출력 (assets/deck-v1 문서의 원본)
//       node playtests/deck-eval.js --tune     기본치를 등급 목표에 맞게 자동 조정한 뒤 결과 출력 (조정된 base 를 표시)
//
// 판정 모델 (제안, 결정 아님):
//   공격 2장·수비 2장. N = 공격 기본치 합 - 수비 기본치 합 + (공격 키워드 시너지 + 특수 시너지) - (수비 키워드 시너지 + 특수 시너지) + 교차 상성 4개 합.
//   키워드 시너지: 공격 템포 8-4|dT|, 방식 8-4|dM|, 폭 6-3|dW| / 수비 높이 8-4|dH|, 마킹 8-4|dK|, 성향 6-3|dP| (축 값은 -2~+2).
//   r = N + d20. 공격에 '2d20 중 큰 값' 카드가 있고 수비에 컴팩트가 없으면 2d20 중 큰 값.
//   r 로 결과 등급: ≤2 카운터(0) / 3~6 소유 상실(15) / 7~10 유지(35) / 11~14 전진(55) / 15~18 찬스1(72) / 19~22 찬스2(88) / ≥23 찬스3(100)
//   카드의 상한·하한 효과를 등급에 적용. value = 결과 효용의 기댓값 (0~100). 수비 value = 100 - 공격 value.
'use strict';
const fs=require('fs');const args=process.argv.slice(2);

// ---------- 카드 ----------
// grade: S 안정형 / C 조합형 / X 상황형. base 는 --tune 으로 조정.
const ATT=[
 {id:'A01',name:'후방 빌드업',grade:'S',base:13,ax:[-2,-2,0],tags:['점유','후방'],desc:'골키퍼와 센터백부터 짧게 연결해 전진한다.'},
 {id:'A02',name:'티키타카',grade:'S',base:11,ax:[-1,-2,-1],tags:['점유','중앙'],desc:'짧은 패스 연결로 상대를 끌어내고 공간을 만든다.'},
 {id:'A03',name:'롱볼',grade:'S',base:9,ax:[2,2,0],tags:['직선','전방'],desc:'후방에서 한 번에 전방으로 보낸다.'},
 {id:'A04',name:'측면 오버로드',grade:'S',base:8,ax:[-1,-1,2],tags:['측면','점유'],desc:'한쪽 측면에 수적 우위를 만든다.'},
 {id:'A05',name:'스위칭 플레이',grade:'S',base:5,ax:[0,-1,2],tags:['측면','점유'],desc:'긴 횡패스로 반대편 측면으로 전환한다.'},
 {id:'A06',name:'중거리 슛',grade:'S',base:1,ax:[0,1,-1],tags:['마무리'],dice:'max',desc:'박스 밖에서 때린다. 한 방.'},
 {id:'A07',name:'템포 조절',grade:'S',base:15,ax:[-2,-2,0],tags:['점유','안전'],floor:1,cap:4,desc:'공을 돌리며 위험을 피한다. 카운터를 맞지 않지만 결정적 기회도 없다.'},
 {id:'A08',name:'오버래핑 풀백',grade:'C',base:4,ax:[1,0,2],tags:['측면'],desc:'풀백이 윙어 바깥으로 올라가 폭을 만든다.'},
 {id:'A09',name:'얼리 크로스',grade:'C',base:10,ax:[2,2,2],tags:['측면','직선'],desc:'수비가 자리 잡기 전에 일찍 올린다.'},
 {id:'A10',name:'컷백',grade:'C',base:2,ax:[0,0,1],tags:['측면','마무리'],desc:'엔드라인까지 가서 뒤로 내준다.'},
 {id:'A11',name:'하프스페이스 침투',grade:'C',base:2,ax:[0,-1,0],tags:['중앙','점유'],desc:'측면과 중앙 사이 공간으로 파고든다.'},
 {id:'A12',name:'스루패스',grade:'C',base:4,ax:[1,1,-1],tags:['중앙','직선'],desc:'수비 라인 사이로 찔러 넣는다.'},
 {id:'A13',name:'인버티드 윙어',grade:'C',base:1,ax:[0,0,0],tags:['측면','중앙'],desc:'윙어가 안쪽으로 접어 들어온다.'},
 {id:'A14',name:'세컨볼 회수',grade:'C',base:5,ax:[1,2,0],tags:['직선','압박'],desc:'떨어지는 공을 먼저 줍는다.'},
 {id:'A15',name:'세트피스 유도',grade:'C',base:3,ax:[-1,0,0],tags:['세트피스'],desc:'파울을 끌어내 프리킥·코너로 간다.'},
 {id:'A16',name:'역습',grade:'X',base:5,ax:[2,1,0],tags:['전환','직선'],desc:'공을 얻자마자 빠르게 앞으로.'},
 {id:'A17',name:'라인 브레이킹 런',grade:'X',base:3,ax:[2,1,-1],tags:['전방','직선'],dice:'max',desc:'수비 라인 뒤로 달린다. 걸리면 오프사이드.'},
 {id:'A18',name:'개인 돌파',grade:'X',base:1,ax:[1,0,2],tags:['측면','1v1'],dice:'max',desc:'한 명이 1대1로 제친다.'},
 {id:'A19',name:'타겟맨 활용',grade:'X',base:4,ax:[1,2,0],tags:['전방','직선'],desc:'큰 공격수가 공을 지키고 떨궈 준다.'},
 {id:'A20',name:'폴스 나인',grade:'X',base:5,ax:[-1,-1,-1],tags:['중앙','점유'],desc:'공격수가 내려와 센터백을 끌어낸다.'},
];
const DEF=[
 {id:'D01',name:'하이 프레스',grade:'S',base:12,ax:[2,0,2],tags:['압박','전방'],desc:'상대 진영에서부터 압박한다.'},
 {id:'D02',name:'미들 블록',grade:'S',base:3,ax:[0,-1,0],tags:['블록'],desc:'중원에 블록을 세우고 기다린다.'},
 {id:'D03',name:'로우 블록',grade:'S',base:12,ax:[-2,-1,-2],tags:['블록','후방'],desc:'자기 진영 깊숙이 내려선다.'},
 {id:'D04',name:'지역 수비',grade:'S',base:7,ax:[0,-2,-1],tags:['마킹'],desc:'사람이 아니라 공간을 지킨다.'},
 {id:'D05',name:'맨마킹',grade:'S',base:11,ax:[0,2,1],tags:['마킹'],desc:'사람을 따라붙는다.'},
 {id:'D06',name:'컴팩트',grade:'S',base:1,ax:[0,-1,-1],tags:['블록'],nomax:true,desc:'라인 간격을 좁혀 한 방을 지운다. 상대의 2d20 효과를 무효로 한다.'},
 {id:'D07',name:'딥 라인',grade:'S',base:8,ax:[-2,0,-1],tags:['라인','후방'],desc:'수비 라인을 내려 뒷공간을 없앤다.'},
 {id:'D08',name:'게겐프레싱',grade:'C',base:9,ax:[1,1,2],tags:['압박','전환'],desc:'공을 잃은 직후 5초 안에 되찾는다.'},
 {id:'D09',name:'하이 라인',grade:'C',base:10,ax:[2,-1,1],tags:['라인','전방'],desc:'수비 라인을 올려 공간을 압축한다.'},
 {id:'D10',name:'오프사이드 트랩',grade:'C',base:7,ax:[2,-1,0],tags:['라인'],desc:'라인을 맞춰 올려 침투를 걸어 낸다.'},
 {id:'D11',name:'스위퍼 키퍼',grade:'C',base:4,ax:[1,0,1],tags:['골키퍼','전방'],desc:'골키퍼가 나와 뒷공간을 정리한다.'},
 {id:'D12',name:'박스 밀집',grade:'C',base:10,ax:[-2,-1,-2],tags:['블록','후방'],desc:'페널티 박스 안에 몸을 던진다.'},
 {id:'D13',name:'5백',grade:'C',base:2,ax:[-1,0,-1],tags:['블록','측면'],desc:'센터백 3명과 윙백으로 폭을 막는다.'},
 {id:'D14',name:'더블 피봇',grade:'C',base:0,ax:[0,-1,0],tags:['중앙'],desc:'수비형 미드필더 둘이 중앙을 잠근다.'},
 {id:'D15',name:'측면 봉쇄',grade:'C',base:3,ax:[0,1,1],tags:['측면'],desc:'윙어를 바깥으로 몰고 더블팀한다.'},
 {id:'D16',name:'압박 트리거',grade:'X',base:5,ax:[1,0,2],tags:['압박'],desc:'백패스·횡패스 순간에만 달려든다.'},
 {id:'D17',name:'전술적 파울',grade:'X',base:1,ax:[0,1,1],tags:['파울'],cap:4,desc:'위험해지기 전에 끊는다. 결정적 기회는 주지 않는다.'},
 {id:'D18',name:'역습 세팅',grade:'X',base:1,ax:[-1,0,-1],tags:['전환'],counterUp:true,desc:'뒤에 남아 있다가 뺏는 즉시 달린다. 상대의 실패는 카운터가 된다.'},
 {id:'D19',name:'슛 스토퍼 GK',grade:'X',base:3,ax:[-1,0,-2],tags:['골키퍼','후방'],cap:5,desc:'골키퍼가 라인을 지킨다. 결정적 기회를 좋은 기회로 낮춘다.'},
 {id:'D20',name:'세트피스 수비',grade:'X',base:1,ax:[-1,0,-1],tags:['세트피스'],desc:'코너·프리킥에서 지역과 사람을 섞어 막는다.'},
];

// ---------- 시너지 (같은 편 두 장). 양수 = 잘 맞음, 음수 = 상충 ----------
const SYN_A=[
 ['A03','A19',8,'롱볼의 종착지가 타겟맨'],['A03','A14',6,'롱볼 뒤 세컨볼 싸움'],['A03','A17',4,'롱볼 뒤로 달리는 침투'],
 ['A19','A14',4,'타겟맨의 낙하 공을 회수'],['A19','A09',6,'얼리 크로스의 타깃'],['A19','A15',4,'공중볼 세트피스'],
 ['A12','A17',8,'스루패스와 침투 러너'],['A12','A11',4,'하프스페이스에서 찌르기'],['A12','A16',4,'역습의 마지막 패스'],
 ['A16','A17',4,'전환 순간의 침투'],['A16','A18',4,'역습에서의 1대1'],['A16','A03',4,'다이렉트 전환'],
 ['A05','A18',6,'오버로드 투 아이솔레이트: 반대편 1대1'],['A05','A04',4,'한쪽 과부하 뒤 전환'],
 ['A04','A08',4,'풀백이 과부하에 가담'],['A04','A10',4,'과부하 뒤 컷백'],
 ['A08','A13',6,'윙어는 안으로, 풀백은 바깥으로'],['A08','A09',4,'풀백의 얼리 크로스'],['A08','A10',4,'풀백의 컷백'],
 ['A13','A11',4,'접어 들어온 윙어가 하프스페이스로'],['A13','A06',4,'접어서 슛'],
 ['A11','A20',4,'내려온 9번이 비운 공간을 침투'],['A11','A02',4,'짧은 패스로 하프스페이스 진입'],['A11','A10',4,'하프스페이스에서 컷백'],
 ['A20','A17',6,'9번이 내려오면 다른 선수가 뒤로 달린다'],['A20','A02',4,'내려온 9번이 연결 고리'],
 ['A01','A02',4,'후방부터 짧게'],['A01','A07',4,'점유로 경기 운영'],['A02','A07',4,'점유로 시계 돌리기'],['A02','A05',2,'점유 중 전환'],
 ['A06','A10',4,'컷백 뒤 슛'],['A06','A14',4,'슛 뒤 리바운드'],['A15','A09',2,'크로스 경합에서 파울'],['A18','A13',2,'접어 들어가며 1대1'],
 ['A01','A16',-6,'느린 빌드업과 빠른 역습은 양립 불가'],['A01','A03',-4,'짧게 쌓다가 길게 차는 모순'],['A02','A03',-6,'티키타카와 롱볼'],
 ['A02','A16',-4,'점유와 역습'],['A07','A16',-6,'시간 끌기와 역습'],['A07','A03',-4,'안전 점유와 롱볼'],['A07','A17',-4,'안전 점유와 뒷공간 러닝'],
 ['A07','A06',-4,'안전 점유와 한 방'],['A19','A20',-6,'타겟맨과 폴스 나인은 같은 자리'],['A19','A02',-4,'타겟맨은 짧은 연계에 약함'],
 ['A09','A20',-4,'박스에 받을 사람이 없다'],['A09','A13',-4,'윙어가 크로스 위치에 없다'],['A10','A03',-4,'롱볼 뒤 컷백은 없다'],
 ['A10','A09',-4,'얼리 크로스와 컷백은 양자택일'],['A18','A04',-4,'붐비는 측면에서 1대1'],['A18','A02',-2,'점유 축구에서 개인 플레이'],
 ['A14','A02',-4,'세컨볼은 점유 축구에 없다'],['A17','A01',-2,'뒤에서 쌓는 동안 러너는 대기'],['A11','A03',-4,'롱볼과 하프스페이스'],
 ['A12','A19',-2,'타겟맨은 뒷공간을 안 판다'],['A15','A16',-2,'역습은 파울 유도와 멀다'],['A05','A16',-2,'횡전환은 역습 속도를 죽인다'],['A08','A07',-2,'풀백 오버래핑은 안전 점유와 맞지 않다'],
];
const SYN_D=[
 ['D01','D09',8,'압박과 높은 라인으로 공간 압축'],['D01','D08',6,'압박 뒤 즉시 재압박'],['D01','D16',4,'압박 신호 공유'],
 ['D09','D10',8,'높은 라인의 오프사이드 트랩'],['D09','D11',6,'라인 뒤를 키퍼가 정리'],['D10','D11',4,'트랩 실패의 보험'],
 ['D08','D16',4,'전환 순간이 트리거'],['D08','D09',4,'재압박과 높은 라인'],
 ['D03','D12',6,'내려서서 박스를 채움'],['D03','D07',4,'낮은 블록과 낮은 라인'],['D03','D13',4,'5백 로우 블록'],['D03','D19',4,'라인 사수 키퍼'],['D03','D18',4,'내려서서 역습'],
 ['D12','D19',4,'박스 밀집과 키퍼'],['D12','D04',4,'박스 안 지역 수비'],['D12','D20',4,'세트피스 밀집'],
 ['D13','D18',4,'윙백이 역습을 이끈다'],['D13','D15',4,'윙백과 측면 봉쇄'],
 ['D02','D06',6,'중원 블록의 간격'],['D02','D16',4,'중원에서 트리거 압박'],['D02','D14',4,'블록 앞 더블 피봇'],
 ['D06','D04',4,'좁은 간격의 지역 수비'],['D06','D14',4,'간격과 중앙 잠금'],['D04','D14',4,'지역과 피봇'],['D04','D20',4,'세트피스 지역 수비'],
 ['D05','D17',4,'사람을 잡다가 파울'],['D05','D15',4,'윙어 맨마킹'],['D05','D08',4,'사람 중심 재압박'],
 ['D07','D19',4,'낮은 라인과 라인 사수'],['D07','D18',4,'내려서서 뒷공간 역습'],['D14','D18',4,'레스트 디펜스'],
 ['D15','D06',2,'측면으로 몰고 간격 유지'],['D17','D18',2,'끊고 역습'],['D16','D06',2,'좁혀서 트리거'],
 ['D01','D03',-8,'압박과 내려서기는 양립 불가'],['D01','D07',-6,'압박과 낮은 라인'],['D01','D12',-6,'압박과 박스 밀집'],['D01','D13',-4,'압박과 5백'],
 ['D09','D07',-8,'라인 높이는 하나'],['D09','D03',-6,'높은 라인과 로우 블록'],['D09','D12',-4,'높은 라인과 박스 밀집'],
 ['D10','D07',-6,'트랩은 라인을 내려서 못 건다'],['D10','D03',-4,'로우 블록의 트랩'],['D10','D05',-4,'맨마킹은 라인을 깬다'],
 ['D11','D19',-8,'골키퍼 스타일은 하나'],['D11','D03',-4,'스위퍼 키퍼와 로우 블록'],['D11','D07',-4,'스위퍼 키퍼와 낮은 라인'],
 ['D04','D05',-6,'지역과 맨마킹'],['D08','D03',-6,'재압박과 내려서기'],['D08','D07',-4,'재압박과 낮은 라인'],['D08','D18',-4,'재압박과 역습 세팅은 방향이 반대'],
 ['D16','D03',-4,'트리거 압박과 로우 블록'],['D16','D07',-4,'트리거 압박과 낮은 라인'],['D12','D16',-4,'박스 밀집과 트리거'],
 ['D13','D09',-2,'5백과 높은 라인'],['D02','D03',-4,'블록은 하나'],['D02','D01',-2,'미들 블록과 하이 프레스'],['D02','D07',-2,'미들 블록과 낮은 라인'],
 ['D18','D01',-4,'역습 세팅과 하이 프레스'],['D18','D09',-4,'역습 세팅과 높은 라인'],['D20','D01',-2,'세트피스 조직과 압박'],['D15','D09',-2,'측면 봉쇄와 높은 라인'],
];

// ---------- 교차 상성 (공격 카드, 수비 카드, 값, 이유). 양수 = 공격 유리 ----------
const VS=[
 ['A01','D01',-3,'높은 곳에서 뺏김'],['A01','D16',-3,'백패스에 트리거'],['A01','D03',2,'저항 없이 전진'],['A01','D12',2,'박스 밖은 자유'],['A01','D13',2,'점유를 허용'],['A01','D07',1,'낮은 라인 앞 공간'],['A01','D08',-1,'전환 순간 압박'],['A01','D18',1,'수동적 세팅'],
 ['A02','D05',2,'마커를 끌고 다님'],['A02','D01',-1,'강한 압박에 흔들림'],['A02','D08',-2,'빠른 재압박'],['A02','D06',-1,'공간 없음'],['A02','D09',-1,'압축된 공간'],['A02','D03',1,'점유 유지'],['A02','D16',-1,'횡패스 트리거'],['A02','D18',1,'수동적 세팅'],['A02','D17',-1,'리듬을 끊는 파울'],
 ['A03','D01',3,'프레스 뒷공간'],['A03','D09',2,'라인 뒤로'],['A03','D08',2,'압박을 넘김'],['A03','D16',2,'트리거를 무시'],['A03','D03',-2,'뒷공간 없음'],['A03','D07',-2,'낮은 라인'],['A03','D11',-2,'키퍼가 처리'],['A03','D02',-1,'세컨볼 회수'],['A03','D12',-1,'박스 밀집'],['A03','D10',1,'타이밍 맞으면 라인 뒤'],
 ['A04','D06',2,'중앙 밀집이면 측면 자유'],['A04','D14',2,'중앙 차단은 측면 허용'],['A04','D13',-2,'윙백의 수적 대응'],['A04','D15',-2,'측면 더블팀'],['A04','D03',1,'측면은 열림'],['A04','D04',1,'한 존 과부하'],['A04','D05',-1,'사람이 따라옴'],['A04','D18',-1,'측면 과부하 뒤 역습'],
 ['A05','D06',2,'반대편 공간'],['A05','D02',2,'이동 지연'],['A05','D15',2,'한쪽으로 몰린 수비'],['A05','D05',1,'마커 재배치'],['A05','D01',-1,'긴 횡패스의 위험'],['A05','D16',-2,'횡패스 차단'],
 ['A06','D03',2,'박스 밖 공간'],['A06','D12',3,'박스 밖은 비어 있음'],['A06','D07',2,'낮은 라인 앞'],['A06','D19',-3,'라인 사수 키퍼'],['A06','D14',-2,'슛 차단'],['A06','D05',-1,'밀착'],['A06','D01',-2,'슛 거리까지 못 감'],['A06','D11',2,'라인 이탈 키퍼'],
 ['A07','D01',-2,'압박에 시간 없음'],['A07','D16',-3,'백패스마다 트리거'],['A07','D08',-1,'재압박'],['A07','D03',1,'마음껏 소유'],['A07','D07',1,'낮은 라인'],['A07','D13',1,'5백은 기다림'],['A07','D18',1,'역습 세팅은 기다림'],
 ['A08','D15',-2,'측면 봉쇄'],['A08','D18',-2,'풀백 뒷공간 역습'],['A08','D13',-1,'윙백 매칭'],['A08','D06',1,'폭 제공'],['A08','D04',1,'지역 수비의 측면 부담'],['A08','D05',1,'마커를 끌어냄'],['A08','D08',-1,'오버랩 중 재압박'],
 ['A09','D09',3,'라인 뒤로 떨어지는 크로스'],['A09','D10',1,'트랩 중 얼리 크로스'],['A09','D12',-3,'박스 밀집'],['A09','D04',-1,'존 커버'],['A09','D20',-1,'공중볼 조직'],['A09','D05',1,'마커 이탈'],['A09','D01',1,'빨리 넘김'],['A09','D13',-1,'센터백 3명'],
 ['A10','D03',2,'골문을 등진 수비'],['A10','D12',1,'밀집 뒤 공간'],['A10','D07',2,'내려선 라인 앞'],['A10','D04',-2,'컷백 존 커버'],['A10','D14',-2,'아크 차단'],['A10','D05',1,'마커 이탈'],['A10','D09',-1,'엔드라인까지 못 감'],
 ['A11','D02',2,'라인 사이'],['A11','D04',2,'존 사이'],['A11','D06',-2,'간격 없음'],['A11','D13',-2,'센터백이 하프스페이스 커버'],['A11','D14',-2,'피봇 차단'],['A11','D15',-1,'바깥으로 몰림'],['A11','D03',-1,'공간 없음'],['A11','D05',1,'마커 끌어냄'],
 ['A12','D09',3,'라인 뒤 공간'],['A12','D10',-3,'걸림'],['A12','D11',-2,'키퍼가 나옴'],['A12','D03',-2,'공간 없음'],['A12','D07',-2,'낮은 라인'],['A12','D04',1,'존 사이 침투'],['A12','D14',-2,'차단'],['A12','D01',1,'뒷공간'],['A12','D18',-1,'실패하면 역습'],
 ['A13','D15',-2,'바깥으로 몰림'],['A13','D04',1,'존 사이로 진입'],['A13','D05',1,'풀백을 안으로 끌고 감'],['A13','D14',-2,'안쪽 차단'],['A13','D06',-1,'간격'],['A13','D13',-1,'센터백 3명'],['A13','D02',1,'블록 사이'],
 ['A14','D02',2,'세컨볼 우위'],['A14','D03',1,'클리어 회수'],['A14','D12',2,'클리어가 많다'],['A14','D07',1,'낮은 라인의 클리어'],['A14','D01',-1,'압박 속 회수 실패'],['A14','D08',-2,'상대가 먼저 회수'],['A14','D18',1,'전방에 상대가 적다'],
 ['A15','D17',3,'파울 유도'],['A15','D05',2,'밀착 마킹의 파울'],['A15','D08',1,'재압박 파울'],['A15','D01',1,'압박 파울'],['A15','D20',-3,'세트피스 조직'],['A15','D04',-1,'파울 적은 지역 수비'],['A15','D19',-1,'키퍼 처리'],['A15','D12',-1,'밀집 처리'],
 ['A16','D01',3,'압박 뒷공간'],['A16','D09',3,'라인 뒤'],['A16','D16',2,'트리거 뒤 공간'],['A16','D08',-3,'재압박에 끊김'],['A16','D03',-3,'공간 없음'],['A16','D18',-2,'상대도 뒤에 인원'],['A16','D07',-1,'낮은 라인'],['A16','D02',1,'블록 전 전진'],['A16','D17',-2,'전환을 파울로 끊음'],
 ['A17','D09',3,'라인 뒤'],['A17','D10',-4,'오프사이드'],['A17','D11',-2,'키퍼 처리'],['A17','D07',-2,'뒷공간 없음'],['A17','D03',-2,'공간 없음'],['A17','D05',1,'마커를 끌고 달림'],['A17','D01',2,'압박 뒤 공간'],['A17','D04',1,'존 사이'],
 ['A18','D05',2,'1대1 고립'],['A18','D15',-2,'더블팀'],['A18','D04',-1,'커버 존재'],['A18','D06',-2,'공간 없음'],['A18','D17',-2,'파울로 끊음'],['A18','D03',-1,'밀집'],['A18','D09',1,'뒤 공간 있는 1대1'],['A18','D02',1,'블록 앞 1대1'],
 ['A19','D05',-2,'센터백 밀착'],['A19','D13',-2,'센터백 3명'],['A19','D12',-1,'밀집'],['A19','D09',2,'홀드업으로 시간'],['A19','D01',2,'탈압박 출구'],['A19','D11',1,'키퍼 나오면 떨궈 줌'],['A19','D20',-1,'공중볼 조직'],['A19','D04',1,'존 사이에서 홀드업'],
 ['A20','D05',3,'센터백을 끌어냄'],['A20','D10',2,'내려오는 움직임이 라인을 흔듦'],['A20','D04',-2,'넘겨주기'],['A20','D14',-2,'내려온 공간에 피봇'],['A20','D06',-1,'간격'],['A20','D13',-1,'여분 센터백'],['A20','D09',1,'라인 앞 공간'],['A20','D17',-1,'끌어낸 순간 파울'],
];

// ---------- 모델 ----------
const F=parseInt(process.env.DICE||'20',10),B=parseInt(process.env.BAND||'4',10),SC=parseFloat(process.env.SYN||'1');
const BANDS=[{min:-999,u:0,name:'카운터'},{min:3,u:15,name:'소유 상실'},{min:3+B,u:35,name:'유지'},{min:3+2*B,u:55,name:'전진'},{min:3+3*B,u:72,name:'찬스 1'},{min:3+4*B,u:88,name:'찬스 2'},{min:3+5*B,u:100,name:'찬스 3'}];
function bandOf(r){let b=0;for(let i=1;i<BANDS.length;i++)if(r>=BANDS[i].min)b=i;return b;}
const idxA=Object.fromEntries(ATT.map((c,i)=>[c.id,i])),idxD=Object.fromEntries(DEF.map((c,i)=>[c.id,i]));
const synA=Array.from({length:20},()=>Array(20).fill(0)),synD=Array.from({length:20},()=>Array(20).fill(0)),vs=Array.from({length:20},()=>Array(20).fill(0));
// 키워드 시너지 (모든 쌍에 적용). 공격: 템포 합치 4-2|dT|, 방식 합치 4-2|dM|, 폭 합치 2-|dW|. 수비: 높이 4-2|dH|, 마킹 3-1.5|dK|, 성향 2-|dP|.
const KW1=parseInt(process.env.KW1||'8',10),KW2=parseInt(process.env.KW2||'6',10),KW3=parseInt(process.env.KW3||'8',10);
function kwA(a,b){const [t1,m1,w1]=ATT[a].ax,[t2,m2,w2]=ATT[b].ax;return (KW1-(KW1/2)*Math.abs(t1-t2))+(KW1-(KW1/2)*Math.abs(m1-m2))+(KW2-(KW2/2)*Math.abs(w1-w2));}
function kwD(a,b){const [h1,k1,p1]=DEF[a].ax,[h2,k2,p2]=DEF[b].ax;return (KW1-(KW1/2)*Math.abs(h1-h2))+(KW3-(KW3/2)*Math.abs(k1-k2))+(KW2-(KW2/2)*Math.abs(p1-p2));}
for(let i=0;i<20;i++)for(let j=0;j<20;j++)if(i!==j){synA[i][j]=kwA(i,j);synD[i][j]=kwD(i,j);}
for(const [a,b,v] of SYN_A){synA[idxA[a]][idxA[b]]+=v*SC;synA[idxA[b]][idxA[a]]+=v*SC;}
for(const [a,b,v] of SYN_D){synD[idxD[a]][idxD[b]]+=v*SC;synD[idxD[b]][idxD[a]]+=v*SC;}
const VSC=parseFloat(process.env.VSC||'1');for(const [a,d,v] of VS)vs[idxA[a]][idxD[d]]=v*VSC;
const pairs=[];for(let i=0;i<20;i++)for(let j=i+1;j<20;j++)pairs.push([i,j]);
// 주사위 분포 (1d20, max of 2, min of 2)
const P1=Array.from({length:F+1},(_,k)=>k?1/F:0),PMAX=Array.from({length:F+1},(_,k)=>k?(2*k-1)/(F*F):0),PMIN=Array.from({length:F+1},(_,k)=>k?(2*(F+1-k)-1)/(F*F):0);
function ev(ai,aj,di,dj){const A=[ATT[ai],ATT[aj]],D=[DEF[di],DEF[dj]];
  const N=A[0].base+A[1].base-D[0].base-D[1].base+synA[ai][aj]-synD[di][dj]+vs[ai][di]+vs[ai][dj]+vs[aj][di]+vs[aj][dj];
  const v=D.some(c=>c.nomax)?0:A.filter(c=>c.dice==='max').length;const P=v>0?PMAX:P1;
  const capA=Math.min(...A.map(c=>c.cap!==undefined?c.cap:6)),floorA=Math.max(...A.map(c=>c.floor!==undefined?c.floor:0));
  const capD=Math.min(...D.map(c=>c.cap!==undefined?c.cap:6)),counterUp=D.some(c=>c.counterUp);
  let e=0;for(let k=1;k<=F;k++){let b=bandOf(N+k);if(counterUp&&b===1)b=0;b=Math.min(b,capD);b=Math.min(b,capA);b=Math.max(b,floorA);e+=P[k]*BANDS[b].u;}
  return {ev:e,N};}
function evaluate(){const M=pairs.map(()=>new Array(pairs.length));for(let p=0;p<pairs.length;p++)for(let q=0;q<pairs.length;q++)M[p][q]=ev(pairs[p][0],pairs[p][1],pairs[q][0],pairs[q][1]).ev;
  const VA=M.map(row=>row.reduce((a,b)=>a+b,0)/row.length);const VD=pairs.map((_,q)=>100-M.reduce((a,row)=>a+row[q],0)/pairs.length);
  const cardA=ATT.map((_,i)=>{const xs=pairs.map((p,k)=>p.includes(i)?VA[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  const cardD=DEF.map((_,i)=>{const xs=pairs.map((p,k)=>p.includes(i)?VD[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  return {M,VA,VD,cardA,cardD};}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,sd=xs=>{const m=mean(xs);return Math.sqrt(mean(xs.map(x=>(x-m)*(x-m))));};
function dupes(xs,digits){const seen={};let d=0;for(const x of xs){const k=x.toFixed(digits);if(seen[k])d++;seen[k]=1;}return d;}
function gradeStats(cards,vals){const g={};cards.forEach((c,i)=>{(g[c.grade]=g[c.grade]||[]).push(vals[i]);});return Object.fromEntries(Object.entries(g).map(([k,v])=>[k,{n:v.length,mean:mean(v),spread:Math.max(...v)-Math.min(...v)}]));}

// ---------- 튜닝: 등급 목표에 맞춰 기본치를 정수로 조정 ----------
const TARGET_A={S:46,C:44,X:42},TARGET_D={S:58,C:56,X:54};
function tune(){let it=0;for(;it<600;it++){const r=evaluate();let moved=0;
  ATT.forEach((c,i)=>{const d=TARGET_A[c.grade]-r.cardA[i];if(Math.abs(d)>1.8){c.base+=d>0?1:-1;moved++;}});
  DEF.forEach((c,i)=>{const d=TARGET_D[c.grade]-r.cardD[i];if(Math.abs(d)>1.8){c.base+=d>0?1:-1;moved++;}});
  if(!moved)break;}if(args.includes('--tune'))console.error('tune iterations',it);}

// ---------- 출력 ----------
if(args.includes('--tune'))tune();
const R=evaluate();
const gA=gradeStats(ATT,R.cardA),gD=gradeStats(DEF,R.cardD);
if(args.includes('--md')){
  const nm=i=>ATT[i].name,nd=i=>DEF[i].name;
  const out=[];
  out.push('## 카드 목록\n');
  for(const [side,cards,syn,list] of [['공격',ATT,synA,SYN_A],['수비',DEF,synD,SYN_D]]){
    out.push('### '+side+' 20장\n');out.push('| ID | 카드 | 등급 | 기본 | 키워드 ('+(side==='공격'?'템포/방식/폭':'높이/마킹/성향')+') | 카드 value | 컨셉 | 특수 시너지 | 상충 | 상성 (상대 카드) | 판정 효과 |');out.push('|---|---|---|---|---|---|---|---|---|---|---|');
    cards.forEach((c,i)=>{const isA=side==='공격';const vals=isA?R.cardA:R.cardD;const idx=isA?idxA:idxD;const other=isA?DEF:ATT;
      const sy=list.filter(x=>(x[0]===c.id||x[1]===c.id)&&x[2]>0).map(x=>(x[0]===c.id?cards[idx[x[1]]].name:cards[idx[x[0]]].name)+' +'+x[2]).join(', ');
      const an=list.filter(x=>(x[0]===c.id||x[1]===c.id)&&x[2]<0).map(x=>(x[0]===c.id?cards[idx[x[1]]].name:cards[idx[x[0]]].name)+' '+x[2]).join(', ');
      const cs=VS.filter(x=>(isA?x[0]:x[1])===c.id).map(x=>{const v=isA?x[2]:-x[2];return 'vs '+(isA?DEF[idxD[x[1]]].name:ATT[idxA[x[0]]].name)+' '+(v>0?'+':'')+v;}).join(', ');
      const fx=[];if(c.dice==='max')fx.push('2d20 중 큰 값');if(c.nomax)fx.push('상대의 2d20 효과 무효');if(c.floor!==undefined)fx.push('카운터를 소유 상실로');if(c.cap!==undefined)fx.push('결과 상한 '+BANDS[c.cap].name);if(c.counterUp)fx.push('소유 상실을 카운터로');
      const axl=side==='공격'?[['느림','빠름'],['점유','직선'],['중앙','측면']]:[['로우','하이'],['지역','맨'],['수동','능동']];const axs=c.ax.map((v,k)=>v===0?'중립':(v<0?axl[k][0]:axl[k][1])+Math.abs(v)).join(' / ');
      out.push('| '+c.id+' | '+c.name+' | '+c.grade+' | '+(c.base>=0?'+':'')+c.base+' | '+axs+' | '+vals[i].toFixed(1)+' | '+c.desc+' | '+(sy||'-')+' | '+(an||'-')+' | '+(cs||'-')+' | '+(fx.join(', ')||'-')+' |');});
    out.push('');}
  out.push('## 특수 시너지 근거\n');
  for(const [side,cards,list,idx] of [['공격',ATT,SYN_A,idxA],['수비',DEF,SYN_D,idxD]]){out.push('### '+side+'\n');out.push('| 카드 | 카드 | 값 | 축구에서의 근거 |');out.push('|---|---|---|---|');
    for(const [a,b,v,why] of list.slice().sort((x,y)=>y[2]-x[2]))out.push('| '+cards[idx[a]].name+' | '+cards[idx[b]].name+' | '+(v>0?'+':'')+v+' | '+why+' |');out.push('');}
  out.push('## 상성 근거 (양수 = 공격 유리)\n');out.push('| 공격 카드 | 수비 카드 | 값 | 근거 |');out.push('|---|---|---|---|');
  for(const [a,d,v,why] of VS)out.push('| '+ATT[idxA[a]].name+' | '+DEF[idxD[d]].name+' | '+(v>0?'+':'')+v+' | '+why+' |');out.push('');
  out.push('## 검증 수치\n');
  out.push('| 항목 | 공격 | 수비 | 요구 |');out.push('|---|---|---|---|');
  out.push('| 조합 value 평균 | '+mean(R.VA).toFixed(1)+' | '+mean(R.VD).toFixed(1)+' | - |');
  out.push('| 조합 value 표준편차 | '+sd(R.VA).toFixed(1)+' | '+sd(R.VD).toFixed(1)+' | ≥ 20 |');
  out.push('| 조합 value 최소 / 최대 | '+Math.min(...R.VA).toFixed(1)+' / '+Math.max(...R.VA).toFixed(1)+' | '+Math.min(...R.VD).toFixed(1)+' / '+Math.max(...R.VD).toFixed(1)+' | - |');
  out.push('| 190 조합 중 value 가 정확히 같은 조합 수 (소수 6자리) | '+dupes(R.VA,6)+' | '+dupes(R.VD,6)+' | < 20 |');
  out.push('| 같은 값 (소수 1자리 반올림) | '+dupes(R.VA,1)+' | '+dupes(R.VD,1)+' | 참고 |');
  for(const g of ['S','C','X'])out.push('| 등급 '+g+' 카드 value 평균 / 편차폭 | '+gA[g].mean.toFixed(1)+' / '+gA[g].spread.toFixed(1)+' | '+gD[g].mean.toFixed(1)+' / '+gD[g].spread.toFixed(1)+' | 편차폭 < 5 |');
  out.push('');
  const top=(vals,n,nmf)=>vals.map((v,k)=>[v,k]).sort((a,b)=>b[0]-a[0]).slice(0,n).map(([v,k])=>nmf(pairs[k][0])+' + '+nmf(pairs[k][1])+' ('+v.toFixed(1)+')');
  const bot=(vals,n,nmf)=>vals.map((v,k)=>[v,k]).sort((a,b)=>a[0]-b[0]).slice(0,n).map(([v,k])=>nmf(pairs[k][0])+' + '+nmf(pairs[k][1])+' ('+v.toFixed(1)+')');
  out.push('## 조합 value 상·하위\n');out.push('공격 상위 8: '+top(R.VA,8,nm).join(' · '));out.push('\n공격 하위 8: '+bot(R.VA,8,nm).join(' · '));
  out.push('\n수비 상위 8: '+top(R.VD,8,nd).join(' · '));out.push('\n수비 하위 8: '+bot(R.VD,8,nd).join(' · '));
  // 매치업 예시: 공격 상위 조합 vs 수비 전체 중 최고/최저
  const bestA=R.VA.indexOf(Math.max(...R.VA));const row=R.M[bestA];const mx=row.indexOf(Math.max(...row)),mn=row.indexOf(Math.min(...row));
  out.push('\n## 매치업 예시\n');out.push('공격 최강 조합 '+nm(pairs[bestA][0])+' + '+nm(pairs[bestA][1])+' 은 수비 '+nd(pairs[mn][0])+' + '+nd(pairs[mn][1])+' 을 만나면 '+row[mn].toFixed(1)+', '+nd(pairs[mx][0])+' + '+nd(pairs[mx][1])+' 을 만나면 '+row[mx].toFixed(1)+' 이다. 같은 조합도 상대에 따라 '+(row[mx]-row[mn]).toFixed(0)+' 점이 갈린다.');
  const allM=R.M.flat();out.push('\n36,100 매치업 전체: 평균 '+mean(allM).toFixed(1)+', 표준편차 '+sd(allM).toFixed(1)+', 최소 '+Math.min(...allM).toFixed(1)+', 최대 '+Math.max(...allM).toFixed(1)+'.');
  console.log(out.join('\n'));
}else{
  console.log('공격 조합 value: 평균',mean(R.VA).toFixed(2),'표준편차',sd(R.VA).toFixed(2),'범위',Math.min(...R.VA).toFixed(1),'~',Math.max(...R.VA).toFixed(1),'중복(6자리)',dupes(R.VA,6),'중복(1자리)',dupes(R.VA,1));
  console.log('수비 조합 value: 평균',mean(R.VD).toFixed(2),'표준편차',sd(R.VD).toFixed(2),'범위',Math.min(...R.VD).toFixed(1),'~',Math.max(...R.VD).toFixed(1),'중복(6자리)',dupes(R.VD,6),'중복(1자리)',dupes(R.VD,1));
  const rowSd=mean(R.M.map(row=>sd(row)));const colSd=mean(pairs.map((_,q)=>sd(R.M.map(row=>row[q]))));const allSd=sd(R.M.flat());
  console.log('매치업: 전체 표준편차',allSd.toFixed(1),'| 공격 조합 하나가 수비 조합에 따라 갈리는 폭(행 표준편차 평균)',rowSd.toFixed(1),'| 수비 조합 기준(열)',colSd.toFixed(1));
  console.log('공격 등급별',JSON.stringify(gA));console.log('수비 등급별',JSON.stringify(gD));
  console.log('공격 카드 value',ATT.map((c,i)=>c.name+'('+c.grade+',b'+c.base+')='+R.cardA[i].toFixed(1)).join(' | '));
  console.log('수비 카드 value',DEF.map((c,i)=>c.name+'('+c.grade+',b'+c.base+')='+R.cardD[i].toFixed(1)).join(' | '));
  if(args.includes('--tune'))console.log('조정된 base: A',ATT.map(c=>c.id+':'+c.base).join(' '),'| D',DEF.map(c=>c.id+':'+c.base).join(' '));
}
