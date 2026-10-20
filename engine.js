/* 인생 상태창 — 결과 생성 엔진 (규칙 기반, 서버·AI 비용 0)
 * 같은 이름·나이·답이면 항상 같은 결과가 나온다(시드 고정).
 * 브라우저에서는 window.SWEngine, Node에서는 require('./engine.js')로 쓴다.
 */
(function (root) {
  'use strict';

  var STATS = [
    { key: 'hp', label: '체력' },
    { key: 'mind', label: '정신력' },
    { key: 'social', label: '사회성' },
    { key: 'money', label: '재력' },
    { key: 'charm', label: '매력' },
    { key: 'luck', label: '행운' }
  ];

  var BASE = { hp: 50, mind: 50, social: 50, money: 45, charm: 50, luck: 50 };

  // 질문: 선택지마다 능력치 변화(fx)와 태그(tags)
  var QUESTIONS = [
    {
      id: 'job', q: '지금 나의 직업 상태는?',
      options: [
        { label: '직장인', fx: { money: 10, mind: -5 }, tags: ['worker'] },
        { label: '학생', fx: { luck: 5, money: -10 }, tags: ['student'] },
        { label: '취준 · 잠시 쉬는 중', fx: { money: -10, luck: 5 }, tags: ['rest'] },
        { label: '프리랜서 · 자영업', fx: { money: 5, mind: -5, luck: 5 }, tags: ['free'] },
        { label: '육아 · 살림', fx: { hp: -5, social: 5, mind: 5 }, tags: ['home_hero'] },
        { label: '비밀', fx: { luck: 10 }, tags: ['secret'] }
      ]
    },
    {
      id: 'exercise', q: '운동은 얼마나 해?',
      options: [
        { label: '주 3회 이상', fx: { hp: 30, charm: 5 }, tags: ['fit'] },
        { label: '가끔 생각날 때', fx: { hp: 10 }, tags: ['some_fit'] },
        { label: '숨쉬기 운동만', fx: { hp: -15 }, tags: ['no_fit'] },
        { label: '계단도 피한다', fx: { hp: -25 }, tags: ['no_fit', 'elevator'] }
      ]
    },
    {
      id: 'sleep', q: '하루 평균 수면 시간은?',
      options: [
        { label: '7시간 이상 꿀잠', fx: { hp: 10, mind: 15 }, tags: ['sleep_good'] },
        { label: '5~6시간', fx: {}, tags: [] },
        { label: '4시간 이하', fx: { hp: -15, mind: -15 }, tags: ['sleep_bad'] },
        { label: '잠은 죽어서 잔다', fx: { hp: -20, mind: -10, luck: 5 }, tags: ['sleep_bad', 'no_sleep'] }
      ]
    },
    {
      id: 'love', q: '연애 상태는?',
      options: [
        { label: '연애 중', fx: { charm: 15, mind: 5 }, tags: ['love'] },
        { label: '썸 타는 중', fx: { charm: 10, luck: 5 }, tags: ['some'] },
        { label: '솔로 1년 이상', fx: {}, tags: ['solo'] },
        { label: '마지막 연애가 기억 안 남', fx: { charm: -5, mind: 5 }, tags: ['solo', 'ancient_solo'] },
        { label: '결혼했다', fx: { social: 5, mind: 5 }, tags: ['married'] }
      ]
    },
    {
      id: 'money', q: '월급날(용돈날) 3일 뒤 내 통장은?',
      options: [
        { label: '아직 든든하다', fx: { money: 25 }, tags: ['rich'] },
        { label: '반쯤 남았다', fx: { money: 5 }, tags: [] },
        { label: '카드값이 다 가져갔다', fx: { money: -15 }, tags: ['card'] },
        { label: '이미 마이너스', fx: { money: -30, luck: -5 }, tags: ['minus'] }
      ]
    },
    {
      id: 'stress', q: '스트레스 받으면 나는?',
      options: [
        { label: '맛있는 걸 먹는다', fx: { hp: 5, mind: 5 }, tags: ['foodie'] },
        { label: '일단 잔다', fx: { mind: 5 }, tags: ['sleeper'] },
        { label: '게임 · 영상으로 도망', fx: { mind: 5, social: -5 }, tags: ['gamer'] },
        { label: '친구를 만난다', fx: { social: 20 }, tags: ['friends'] },
        { label: '장바구니를 결제한다', fx: { money: -15, charm: 10 }, tags: ['shopper'] }
      ]
    },
    {
      id: 'weekend', q: '주말에 나는 주로?',
      options: [
        { label: '무조건 집', fx: { social: -15, mind: 5 }, tags: ['homebody'] },
        { label: '약속이 꽉 차 있다', fx: { social: 20, hp: -5 }, tags: ['party'] },
        { label: '밀린 일 처리', fx: { money: 10, mind: -10 }, tags: ['workweekend'] },
        { label: '즉흥 여행', fx: { luck: 15, money: -10 }, tags: ['travel'] }
      ]
    },
    {
      id: 'coffee', q: '커피는 하루에 몇 잔?',
      options: [
        { label: '안 마신다', fx: { hp: 5 }, tags: ['nocoffee'] },
        { label: '1잔', fx: {}, tags: [] },
        { label: '2~3잔', fx: { mind: 5, hp: -5 }, tags: ['coffee'] },
        { label: '셀 수 없다 (수혈 수준)', fx: { mind: 10, hp: -10 }, tags: ['coffee', 'coffee_iv'] }
      ]
    },
    {
      id: 'chat', q: '단톡방에서 나는?',
      options: [
        { label: '알림 꺼둠 · 읽씹 장인', fx: { social: -15, mind: 10 }, tags: ['mute'] },
        { label: 'ㅋㅋㅋ 리액션 담당', fx: { social: 10 }, tags: ['reaction'] },
        { label: '분위기 메이커', fx: { social: 25, charm: 5 }, tags: ['maker'] },
        { label: '조용히 눈팅만', fx: { social: -5, luck: 5 }, tags: ['lurker'] }
      ]
    },
    {
      id: 'mood', q: '요즘 내 상태를 한마디로?',
      options: [
        { label: '그럭저럭 괜찮다', fx: { mind: 5 }, tags: [] },
        { label: '번아웃 직전', fx: { mind: -25 }, tags: ['burnout'] },
        { label: '의욕이 넘친다', fx: { mind: 20, hp: 5 }, tags: ['motivated'] },
        { label: '아무 생각이 없다', fx: { luck: 10 }, tags: ['zen'] }
      ]
    }
  ];

  // ---------- 시드 난수 ----------
  function hashString(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- 등급 ----------
  var GRADES = [
    [95, 'S'], [87, 'A+'], [80, 'A'], [73, 'B+'], [66, 'B'],
    [59, 'C+'], [52, 'C'], [45, 'D+'], [37, 'D'], [28, 'E'], [0, 'F']
  ];
  function gradeOf(v) {
    for (var i = 0; i < GRADES.length; i++) if (v >= GRADES[i][0]) return GRADES[i][1];
    return 'F';
  }

  // ---------- 직업(칭호) ----------
  var JOBS = {
    worker: ['회사의 톱니바퀴', '엑셀 마법사', '회의실 생존자', '사원증 소지자'],
    student: ['시험기간 생존자', '과제 마감 전사', '학식 미식가', '출석 마법사'],
    rest: ['충전 중인 용사', '자유 모험가 (무소속)', '다음 챕터 준비생', '숨 고르는 방랑자'],
    free: ['떠돌이 용병', '1인 길드 마스터', '마감 사냥꾼'],
    home_hero: ['가정의 수호자', '24시간 대기 힐러', '집안의 최종 보스'],
    secret: ['정체불명의 방랑자', '???', '비밀 결사 소속']
  };
  // 조합 칭호: 앞에서부터 먼저 맞는 것을 쓴다
  var SPECIAL_JOBS = [
    { all: ['fit', 'sleep_good', 'motivated'], job: '갓생 수련생' },
    { all: ['worker', 'burnout'], job: '야근의 화신' },
    { all: ['worker', 'workweekend'], job: '주말 출근 기사단' },
    { all: ['worker', 'motivated'], job: '사내 에이스 (자칭)' },
    { all: ['worker', 'rich'], job: '월급 방어 전문가' },
    { all: ['student', 'no_sleep'], job: '밤샘 연금술사' },
    { all: ['rest', 'motivated'], job: '각성 직전의 용사' },
    { all: ['free', 'no_sleep'], job: '새벽 마감의 지배자' },
    { all: ['gamer', 'homebody'], job: '현실 로그아웃 중' }
  ];

  // ---------- 특성(버프) ----------
  var BUFFS = [
    { when: ['rich'], name: '월급 방어막', desc: '통장 잔고가 쉽게 줄지 않음' },
    { when: ['worker'], name: '월급날 버프', desc: '매달 월급날 24시간 동안 전 능력치 +20%' },
    { when: ['worker'], name: '월요병 내성 Lv.1', desc: '월요일 출근 시 받는 피해 -10%' },
    { when: ['student'], name: '벼락치기', desc: '시험 전날 밤 지능 일시적 +50' },
    { when: ['rest'], name: '체력 충전 중', desc: '다음 모험을 위해 기력을 모으는 중' },
    { when: ['free'], name: '자유로운 출근길', desc: '지옥철 데미지 면역' },
    { when: ['home_hero'], name: '멀티태스킹 마스터', desc: '동시에 세 가지 일 처리 가능' },
    { when: ['fit'], name: '강철 체력', desc: '계단 5층까지 숨 안 참' },
    { when: ['sleep_good'], name: '꿀잠 스킬', desc: '어디서든 5분 안에 잠듦' },
    { when: ['love'], name: '연애 버프', desc: '휴대폰 알림이 울리면 기분 +30' },
    { when: ['some'], name: '설렘 상태', desc: '답장 기다리는 동안 행운 +10' },
    { when: ['married'], name: '든든한 동료', desc: '파티원 1명 상시 동행' },
    { when: ['foodie'], name: '미식가', desc: '맛있는 걸 먹으면 정신력 완전 회복' },
    { when: ['sleeper'], name: '수면 회복술', desc: '자고 일어나면 걱정 50% 감소' },
    { when: ['gamer'], name: '게이머 감각', desc: '반응 속도 +15 (현실 의욕 -15)' },
    { when: ['friends'], name: '인맥 소환술', desc: '심심할 때 친구를 즉시 소환' },
    { when: ['shopper'], name: '택배 도착 버프', desc: '택배를 받는 순간 행복 +50' },
    { when: ['homebody'], name: '집돌이 결계', desc: '집 안에서 HP 회복 속도 2배' },
    { when: ['party'], name: '약속의 신', desc: '주말 일정이 자동으로 채워짐' },
    { when: ['travel'], name: '방랑벽', desc: '항공권 특가를 감지하는 능력' },
    { when: ['coffee'], name: '카페인 각성', desc: '커피 섭취 후 1시간 집중력 +30' },
    { when: ['nocoffee'], name: '맑은 정신', desc: '카페인 없이도 하루를 버팀' },
    { when: ['maker'], name: '분위기 메이커', desc: '파티원 사기 +10' },
    { when: ['reaction'], name: 'ㅋㅋㅋ 자동 시전', desc: '어떤 대화든 리액션으로 살려냄' },
    { when: ['mute'], name: '마음의 평화', desc: '알림 공격 무효' },
    { when: ['lurker'], name: '은신술', desc: '단톡방에서 존재감 0 유지' },
    { when: ['motivated'], name: '의욕 폭발', desc: '오늘은 뭐든 할 수 있을 것 같음' },
    { when: ['zen'], name: '무념무상', desc: '스트레스 피해 -30%' }
  ];
  var FALLBACK_BUFF = { name: '무난함의 축복', desc: '큰 일 없이 하루를 넘기는 능력' };

  // ---------- 상태이상(디버프) ----------
  var DEBUFFS = [
    { when: ['sleep_bad'], name: '수면 부족', desc: '오후 3시마다 졸음 공격' },
    { when: ['no_sleep'], name: '다크서클 Lv.MAX', desc: '눈 밑 그림자가 영구 장착됨' },
    { when: ['minus'], name: '통장 출혈', desc: '매달 25일 이후 지속 피해' },
    { when: ['card'], name: '카드값 저주', desc: '월급이 통장을 스쳐 지나감' },
    { when: ['burnout'], name: '번아웃 직전', desc: '모든 행동 쿨타임 +50%' },
    { when: ['no_fit'], name: '거북목', desc: '시야 각도 -30°' },
    { when: ['elevator'], name: '엘리베이터 의존증', desc: '2층도 엘리베이터를 탐' },
    { when: ['coffee_iv'], name: '카페인 내성', desc: '커피 효과 점점 감소' },
    { when: ['mute'], name: '읽씹 누적', desc: '안 읽은 메시지 999+' },
    { when: ['workweekend'], name: '주말 실종', desc: '주말이 어디 갔는지 모름' },
    { when: ['shopper'], name: '장바구니 중독', desc: '결제 버튼 앞에서 의지력 0' },
    { when: ['gamer'], name: '한 판만 더', desc: '새벽 2시까지 시간 감각 상실' },
    { when: ['homebody'], name: '외출 귀찮음', desc: '현관문까지 이동 속도 -50%' },
    { when: ['party'], name: '체력 방전', desc: '일요일 밤 HP 1' },
    { when: ['solo'], name: '외로움 (약)', desc: '비 오는 날 감성 데미지' }
  ];
  var FALLBACK_DEBUFF = { name: '이상 없음?', desc: '상태이상이 없다. 수상할 정도로' };

  // ---------- 히든 업적 ----------
  // rarity: 일반 < 희귀 < 영웅 < 전설 (게임식 등급 표시일 뿐, 실제 이용자 비율이 아님)
  var RARITY_ORDER = { '일반': 0, '희귀': 1, '영웅': 2, '전설': 3 };
  var ACHIEVEMENTS = [
    { when: ['fit', 'sleep_good', 'nocoffee'], name: '인간 비타민', desc: '운동·수면·카페인 0을 모두 달성', rarity: '전설' },
    { when: ['worker', 'burnout', 'coffee_iv'], name: '야근 100시간 달성', desc: '커피로 버틴 시간이 쌓였다', rarity: '전설' },
    { when: ['ancient_solo', 'homebody', 'gamer'], name: '솔로 랭킹 1위', desc: '혼자서도 완벽한 주말 운영', rarity: '전설' },
    { when: ['rich', 'nocoffee'], name: '라떼 효과 정복자', desc: '커피값까지 아끼는 재테크 고수', rarity: '영웅' },
    { when: ['fit', 'sleep_good'], name: '갓생 7일 연속', desc: '운동과 꿀잠을 동시에 챙김', rarity: '영웅' },
    { when: ['married', 'home_hero'], name: '가족 레이드 클리어', desc: '매일 밤 육아 보스전 승리', rarity: '영웅' },
    { when: ['maker', 'party'], name: '인싸 칭호 획득', desc: '단톡방과 주말을 모두 장악', rarity: '영웅' },
    { when: ['travel', 'minus'], name: '지금 아니면 언제 가', desc: '통장보다 추억을 택함', rarity: '영웅' },
    { when: ['gamer', 'no_sleep'], name: '새벽 3시의 용사', desc: '한 판만 더를 50번 외침', rarity: '희귀' },
    { when: ['worker', 'workweekend'], name: '주 7일 근무자', desc: '달력에서 주말을 지움', rarity: '희귀' },
    { when: ['student', 'sleep_bad'], name: '벼락치기 3연승', desc: '밤샘으로 시험을 넘김', rarity: '희귀' },
    { when: ['rest', 'zen'], name: '쉼표 마스터', desc: '쉬는 것도 실력이다', rarity: '희귀' },
    { when: ['rest'], name: '다음 퀘스트 탐색 중', desc: '지도를 넓게 펼쳐 놓았다', rarity: '희귀' },
    { when: ['shopper', 'card'], name: '택배 기사님과 절친', desc: '이번 달 택배 20개 돌파', rarity: '희귀' },
    { when: ['coffee_iv'], name: '카페인 수혈자', desc: '혈관에 아메리카노가 흐름', rarity: '희귀' },
    { when: ['love'], name: '퀘스트: 연애 진행 중', desc: '보상은 매일 받는 중', rarity: '일반' },
    { when: ['homebody'], name: '집 지박령', desc: '주말 48시간 연속 실내 체류', rarity: '일반' },
    { when: ['mute'], name: '읽씹의 미학', desc: '알림 999+를 평온하게 바라봄', rarity: '일반' }
  ];
  var FALLBACK_ACH = { name: '튜토리얼 클리어', desc: '오늘도 무사히 하루를 넘김', rarity: '일반' };

  var LOVE_LINES = {
    love: '진행 중 ♥',
    some: '로딩 중...',
    solo: '잠금됨 🔒',
    ancient_solo: '봉인됨 (해금 조건 ???)',
    married: '엔딩 도달 (2회차 없음)'
  };

  var QUESTS = {
    hp: { text: '엘리베이터 대신 계단으로 3층 올라가기', reward: '체력 +5' },
    mind: { text: '오늘 밤 12시 전에 잠들기', reward: '정신력 +10' },
    social: { text: '친구에게 먼저 안부 메시지 보내기', reward: '사회성 +10' },
    money: { text: '오늘 하루 배달 대신 집밥', reward: '재력 +10' },
    charm: { text: '거울 보고 한 번 웃어주기', reward: '매력 +5' },
    luck: { text: '편의점 1+1 득템하기', reward: '행운 +7' }
  };

  var ROLES = {
    hp: '탱커', mind: '힐러', social: '서포터', money: '후원자', charm: '딜러', luck: '도박사'
  };

  // ---------- 생성 ----------
  function hasAll(tags, need) {
    for (var i = 0; i < need.length; i++) if (tags.indexOf(need[i]) < 0) return false;
    return true;
  }

  function normalizeInput(input) {
    var name = String(input.name || '').trim().slice(0, 12) || '이름없는 모험가';
    var age = parseInt(input.age, 10);
    if (!(age >= 1 && age <= 120)) age = 0;
    var answers = (input.answers || []).map(function (a) { return parseInt(a, 10); });
    if (answers.length !== QUESTIONS.length) throw new Error('answers length must be ' + QUESTIONS.length);
    answers.forEach(function (a, i) {
      if (!(a >= 0 && a < QUESTIONS[i].options.length)) throw new Error('invalid answer at ' + i);
    });
    return { name: name, age: age, answers: answers };
  }

  function generate(input) {
    var inp = normalizeInput(input);
    var rng = mulberry32(hashString(inp.name + '|' + inp.age + '|' + inp.answers.join('')));

    var stats = {};
    STATS.forEach(function (s) { stats[s.key] = BASE[s.key]; });
    var tags = [];
    inp.answers.forEach(function (a, i) {
      var opt = QUESTIONS[i].options[a];
      Object.keys(opt.fx).forEach(function (k) { stats[k] += opt.fx[k]; });
      opt.tags.forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
    });
    STATS.forEach(function (s) {
      var jitter = Math.round(rng() * 12) - 6; // ±6
      stats[s.key] = Math.max(3, Math.min(99, stats[s.key] + jitter));
    });
    // 공유할 거리: 가장 높은 능력치는 최소 B(66)
    var bestKey = STATS.reduce(function (k, s) { return stats[s.key] > stats[k] ? s.key : k; }, 'hp');
    if (stats[bestKey] < 66) stats[bestKey] = 66 + Math.floor(rng() * 8);

    var statList = STATS.map(function (s) {
      return { key: s.key, label: s.label, value: stats[s.key], grade: gradeOf(stats[s.key]) };
    });
    var avg = statList.reduce(function (n, s) { return n + s.value; }, 0) / statList.length;
    // 평균은 50 근처에 몰리므로 종합 등급은 폭을 넓혀서 매긴다
    var rankScore = Math.max(0, Math.min(99, Math.round(56 + (avg - 50) * 2.2)));

    var jobTag = QUESTIONS[0].options[inp.answers[0]].tags[0];
    var job = pick(rng, JOBS[jobTag]);
    for (var i = 0; i < SPECIAL_JOBS.length; i++) {
      if (hasAll(tags, SPECIAL_JOBS[i].all)) { job = SPECIAL_JOBS[i].job; break; }
    }

    var buffs = shuffle(rng, BUFFS.filter(function (b) { return hasAll(tags, b.when); })).slice(0, 3);
    if (!buffs.length) buffs = [FALLBACK_BUFF];
    var debuffs = shuffle(rng, DEBUFFS.filter(function (d) { return hasAll(tags, d.when); })).slice(0, 2);
    if (!debuffs.length) debuffs = [FALLBACK_DEBUFF];

    var achs = ACHIEVEMENTS.filter(function (a) { return hasAll(tags, a.when); });
    var ach = FALLBACK_ACH;
    if (achs.length) {
      var top = Math.max.apply(null, achs.map(function (a) { return RARITY_ORDER[a.rarity]; }));
      ach = pick(rng, achs.filter(function (a) { return RARITY_ORDER[a.rarity] === top; }));
    }

    var loveTag = QUESTIONS[3].options[inp.answers[3]].tags;
    var love = LOVE_LINES[loveTag[loveTag.length - 1]];

    var sorted = statList.slice().sort(function (a, b) { return a.value - b.value; });
    var weakest = sorted[0];
    var strongest = sorted[sorted.length - 1];

    return {
      name: inp.name,
      level: inp.age || null,
      job: job,
      rank: gradeOf(rankScore),
      stats: statList,
      love: love,
      buffs: buffs,
      debuffs: debuffs,
      achievement: ach,
      quest: QUESTS[weakest.key],
      role: ROLES[strongest.key],
      strongest: strongest.key,
      weakest: weakest.key
    };
  }

  // ---------- 파티 시너지 ----------
  var SYNERGY = {
    '탱커+힐러': '정석 조합. 한 명이 버티고 한 명이 달랜다',
    '탱커+딜러': '앞에서 막고 뒤에서 매력으로 끝낸다',
    '탱커+서포터': '체력과 인맥, 어디든 끌고 갈 수 있다',
    '탱커+후원자': '몸과 지갑, 현실 최강 조합',
    '탱커+도박사': '도박사가 저지르고 탱커가 수습한다',
    '힐러+딜러': '상처 주고(매력으로) 치료하는 조합',
    '힐러+서포터': '이 파티엔 싸움이 없다. 평화 그 자체',
    '힐러+후원자': '멘탈과 통장이 동시에 회복된다',
    '힐러+도박사': '도박사가 잃으면 힐러가 위로한다',
    '딜러+서포터': '인싸 2인조. 단톡방을 지배한다',
    '딜러+후원자': '보기 좋고 지갑도 두둑한 조합',
    '딜러+도박사': '예측 불가. 무슨 일이든 일어날 수 있다',
    '서포터+후원자': '모임 총무와 물주의 만남',
    '서포터+도박사': '즉흥 약속이 자꾸 생기는 조합',
    '후원자+도박사': '도박사가 후원자 지갑을 노린다. 조심'
  };
  var SAME_ROLE = '같은 역할끼리 뭉쳤다. 장점도 두 배, 약점도 두 배';

  function partySynergy(a, b) {
    if (a.role === b.role) return { title: a.role + ' × 2', text: SAME_ROLE };
    var key1 = a.role + '+' + b.role, key2 = b.role + '+' + a.role;
    return { title: a.role + ' + ' + b.role, text: SYNERGY[key1] || SYNERGY[key2] || '서로 다른 길을 가는 의외의 파티' };
  }

  // ---------- 링크 인코딩 (이름·나이·답만 담는다) ----------
  function toBase64Url(str) {
    var b64;
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
      b64 = Buffer.from(str, 'utf8').toString('base64');
    } else {
      var bytes = new TextEncoder().encode(str), bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      b64 = btoa(bin);
    }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromBase64Url(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeInput(input) {
    var inp = normalizeInput(input);
    return toBase64Url(JSON.stringify({ n: inp.name, g: inp.age, a: inp.answers.join('') }));
  }
  function decodeInput(code) {
    try {
      var o = JSON.parse(fromBase64Url(String(code)));
      var input = { name: o.n, age: o.g, answers: String(o.a).split('') };
      return normalizeInput(input);
    } catch (e) {
      return null;
    }
  }

  var API = {
    STATS: STATS,
    QUESTIONS: QUESTIONS,
    gradeOf: gradeOf,
    generate: generate,
    partySynergy: partySynergy,
    encodeInput: encodeInput,
    decodeInput: decodeInput
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SWEngine = API;
})(typeof window !== 'undefined' ? window : this);
