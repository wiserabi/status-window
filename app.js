/* 인생 상태창 — 화면 흐름 */
(function () {
  'use strict';

  var E = window.SWEngine;
  var CFG = window.SW_CONFIG || {};
  var Q = E.QUESTIONS;

  var state = { name: '', age: 0, answers: [], step: 0, result: null, friend: null };

  // ---------- 측정 ----------
  function loadAnalytics() {
    if (!CFG.goatcounter) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + CFG.goatcounter + '.goatcounter.com/count');
    document.head.appendChild(s);
  }
  function track(name) {
    try {
      var log = JSON.parse(localStorage.getItem('sw_events') || '{}');
      log[name] = (log[name] || 0) + 1;
      localStorage.setItem('sw_events', JSON.stringify(log));
    } catch (e) { /* 사생활 보호 모드 등 */ }
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'event/' + name, title: name, event: true });
    }
  }

  // ---------- 도우미 ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function show(screenId) {
    document.querySelectorAll('.screen').forEach(function (el) { el.classList.remove('active'); });
    $(screenId).classList.add('active');
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  }
  function baseUrl() {
    return CFG.siteUrl || (location.origin + location.pathname);
  }
  function gradeClass(g) { return 'g-' + g.replace('+', 'p'); }

  // ---------- 초대 링크로 들어왔을 때 ----------
  function readInvite() {
    var code = new URLSearchParams(location.search).get('p');
    if (!code) return;
    var input = E.decodeInput(code);
    if (!input) return;
    state.friend = E.generate(input);
    var f = state.friend;
    $('invite-preview').innerHTML =
      '<b>' + esc(f.name) + '</b>' + (f.level ? ' <span class="muted">Lv.' + f.level + '</span>' : '') +
      '<br>' + esc(f.job) + ' · 종합 <span class="rank">' + esc(f.rank) + '</span> · ' + esc(f.role) +
      '<br><span class="muted">내 상태창을 열면 파티 궁합을 볼 수 있어요</span>';
    $('invite-banner').classList.remove('hidden');
    track('invite_open');
  }

  // ---------- 시작 ----------
  $('intro-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('in-name').value.trim();
    var age = parseInt($('in-age').value, 10);
    if (!name) { toast('이름을 입력해 주세요'); return; }
    if (!(age >= 1 && age <= 120)) { toast('나이를 확인해 주세요'); return; }
    state.name = name;
    state.age = age;
    state.answers = [];
    state.step = 0;
    track('start');
    renderQuestion();
    show('screen-quiz');
  });

  // ---------- 질문 ----------
  function renderQuestion() {
    var i = state.step, q = Q[i];
    $('quiz-step').textContent = 'QUEST ' + (i + 1) + ' / ' + Q.length;
    $('progress-bar').style.width = (i / Q.length * 100) + '%';
    $('quiz-q').textContent = q.q;
    var box = $('quiz-options');
    box.innerHTML = '';
    q.options.forEach(function (opt, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = opt.label;
      b.addEventListener('click', function () { answer(idx); });
      box.appendChild(b);
    });
  }
  function answer(idx) {
    state.answers[state.step] = idx;
    if (state.step < Q.length - 1) {
      state.step++;
      renderQuestion();
    } else {
      $('progress-bar').style.width = '100%';
      runLoading();
    }
  }
  $('btn-back').addEventListener('click', function () {
    if (state.step === 0) { show('screen-intro'); return; }
    state.step--;
    renderQuestion();
  });

  // ---------- 로딩 ----------
  function runLoading() {
    show('screen-loading');
    var lines = [
      '[시스템] 사용자 정보를 확인하는 중...',
      '[시스템] 능력치를 측정하는 중...',
      '[시스템] 숨겨진 업적을 찾는 중...',
      '[시스템] 상태창을 엽니다.'
    ];
    var box = $('loading-lines');
    box.innerHTML = '';
    lines.forEach(function (text, i) {
      setTimeout(function () {
        var d = document.createElement('div');
        d.textContent = text;
        box.appendChild(d);
      }, 380 * i);
    });
    setTimeout(showResult, 380 * lines.length + 250);
  }

  // ---------- 결과 ----------
  function showResult() {
    var r = E.generate({ name: state.name, age: state.age, answers: state.answers });
    state.result = r;

    var html = '';
    html += '<div class="window-title">◆ 상태창 ◆</div>';
    html += '<div class="name">' + esc(r.name) + (r.level ? '<span class="lv">Lv.' + r.level + '</span>' : '') + '</div>';
    html += row('직업', esc(r.job));
    html += row('종합 등급', '<span class="' + gradeClass(r.rank) + '">' + esc(r.rank) + '</span>');
    html += row('파티 역할', esc(r.role));
    html += row('연애', esc(r.love));
    html += '<div class="divider"></div>';
    r.stats.forEach(function (s) {
      html += '<div class="stat"><span>' + s.label + '</span>' +
        '<div class="bar"><i style="width:' + s.value + '%"></i></div>' +
        '<span class="g ' + gradeClass(s.grade) + '">' + s.grade + '</span></div>';
    });
    html += '<div class="divider"></div>';
    html += '<div class="sec-title buff">특성</div>';
    r.buffs.forEach(function (b) { html += item(b); });
    html += '<div class="sec-title debuff">상태이상</div>';
    r.debuffs.forEach(function (d) { html += item(d); });
    html += '<div class="sec-title ach">히든 업적<span class="rarity">' + esc(r.achievement.rarity) + '</span></div>';
    html += item(r.achievement);
    html += '<div class="divider"></div>';
    html += '<div class="sec-title quest">[퀘스트]</div>';
    html += '<div class="item"><b>' + esc(r.quest.text) + '</b> <span>(보상: ' + esc(r.quest.reward) + ')</span></div>';
    $('result-window').innerHTML = html;

    if (state.friend) renderParty(state.friend, r);
    else $('party-window').classList.add('hidden');

    show('screen-result');
    track('complete');
    if (state.friend) track('party_complete');
  }
  function row(k, v) { return '<div class="row"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function item(x) { return '<div class="item"><b>' + esc(x.name) + '</b> <span>— ' + esc(x.desc) + '</span></div>'; }

  function renderParty(friend, me) {
    var syn = E.partySynergy(friend, me);
    var html = '<div class="window-title">◆ 파티 결성 ◆</div>';
    html += '<div class="party-head">' + esc(syn.title) + '</div>';
    html += '<div class="names"><div>' + esc(friend.name) + '</div><div></div><div>' + esc(me.name) + '</div></div>';
    friend.stats.forEach(function (fs, i) {
      var ms = me.stats[i];
      var fw = fs.value > ms.value ? ' win' : '', mw = ms.value > fs.value ? ' win' : '';
      html += '<div class="cmp"><div class="l' + fw + '">' + fs.grade + '</div><div class="m">' + fs.label + '</div><div class="r' + mw + '">' + ms.grade + '</div></div>';
    });
    html += '<div class="syn">' + esc(syn.text) + '</div>';
    $('party-window').innerHTML = html;
    $('party-window').classList.remove('hidden');
  }

  // ---------- 이미지 저장 ----------
  $('btn-save').addEventListener('click', function () {
    if (!state.result) return;
    var draw = function () {
      var host = baseUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
      var canvas = window.SWCard.drawCard(state.result, { siteLabel: host });
      var url = canvas.toDataURL('image/png');
      $('card-img').src = url;
      $('card-download').href = url;
      $('modal-image').classList.remove('hidden');
      track('save_image');
    };
    // 글꼴이 다 받아진 뒤 그려야 카드 글자가 깨지지 않는다
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('900 40px "Noto Sans KR"'),
        document.fonts.load('700 40px "Noto Sans KR"'),
        document.fonts.load('400 40px "Noto Sans KR"')
      ]).then(draw, draw);
    } else draw();
  });
  $('card-download').addEventListener('click', function () { track('download_image'); });

  // ---------- 공유 (= 파티 초대) ----------
  $('btn-share').addEventListener('click', function () {
    if (!state.result) return;
    var code = E.encodeInput({ name: state.name, age: state.age, answers: state.answers });
    var url = baseUrl() + '?p=' + code;
    var r = state.result;
    var text = '[상태창] ' + r.name + ' · ' + r.job + ' · 종합 ' + r.rank + '\n너도 상태창 열고 나랑 파티 맺자 👉';
    if (navigator.share) {
      navigator.share({ title: '인생 상태창', text: text, url: url })
        .then(function () { track('share_native'); })
        .catch(function () { /* 사용자가 취소 */ });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url).then(function () {
        toast('초대 링크를 복사했어요. 친구에게 붙여넣기!');
        track('share_copy');
      }, function () { prompt('이 링크를 복사하세요', url); });
    } else {
      prompt('이 링크를 복사하세요', url);
      track('share_copy');
    }
  });

  // ---------- 히든 스탯 (가짜 문: 결제 없음, 관심만 잰다) ----------
  $('btn-hidden').addEventListener('click', function () {
    $('hidden-step1').classList.remove('hidden');
    $('hidden-step2').classList.add('hidden');
    $('modal-hidden').classList.remove('hidden');
    track('paid_click');
  });
  $('btn-interest').addEventListener('click', function () {
    $('hidden-step1').classList.add('hidden');
    $('hidden-step2').classList.remove('hidden');
    track('paid_interest');
  });

  // ---------- 다시 하기 ----------
  $('btn-retry').addEventListener('click', function () {
    state.answers = [];
    state.step = 0;
    state.result = null;
    track('retry');
    show('screen-intro');
  });

  // ---------- 모달 닫기 ----------
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.hasAttribute('data-close')) m.classList.add('hidden');
    });
  });

  loadAnalytics();
  readInvite();
})();
