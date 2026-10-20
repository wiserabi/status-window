/* 결과를 1080×1920(9:16) 이미지 카드로 그린다. 외부 라이브러리 없음. */
(function (root) {
  'use strict';

  var W = 1080, H = 1920;
  var FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  var C = {
    line: '#4fd1ff', text: '#e6f4ff', muted: '#8aa3bd',
    gold: '#ffd36b', red: '#ff6b81', green: '#6bffb5'
  };

  function font(weight, size) { return weight + ' ' + size + 'px ' + FONT; }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 한 줄에 안 들어가면 말줄임
  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  function gradeColor(g) {
    if (g === 'S' || g === 'A+' || g === 'A') return C.gold;
    if (g === 'F' || g === 'E') return C.red;
    return C.text;
  }

  function drawCard(r, opts) {
    opts = opts || {};
    var canvas = (opts.canvas) || document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    // 배경
    var bg = ctx.createRadialGradient(W / 2, 0, 100, W / 2, H * 0.4, H);
    bg.addColorStop(0, '#16295a');
    bg.addColorStop(1, '#060a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 흩날리는 빛 입자(고정 위치)
    ctx.fillStyle = 'rgba(79,209,255,0.18)';
    for (var i = 0; i < 40; i++) {
      var px = (i * 263) % W, py = (i * 577) % H, pr = 1 + (i % 3);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }

    // 창
    var X = 70, Y = 90, WW = W - 140, HH = 1680;
    ctx.save();
    ctx.shadowColor = 'rgba(79,209,255,0.55)';
    ctx.shadowBlur = 40;
    roundRect(ctx, X, Y, WW, HH, 22);
    ctx.fillStyle = 'rgba(16,32,64,0.82)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.line;
    ctx.stroke();
    ctx.restore();

    var L = X + 60, R = X + WW - 60, y = Y + 90;
    ctx.textBaseline = 'alphabetic';

    // 제목
    ctx.textAlign = 'center';
    ctx.fillStyle = C.line;
    ctx.font = font(900, 40);
    ctx.fillText('◆  상 태 창  ◆', W / 2, y);

    // 이름 · 레벨
    y += 95;
    ctx.fillStyle = C.text;
    ctx.font = font(900, 64);
    var title = fitText(ctx, r.name, WW - 260);
    ctx.fillText(title, W / 2, y);
    if (r.level) {
      y += 52;
      ctx.fillStyle = C.line;
      ctx.font = font(700, 36);
      ctx.fillText('Lv. ' + r.level, W / 2, y);
    }

    // 직업 · 등급 · 역할
    y += 80;
    function row(k, v, color) {
      ctx.textAlign = 'left';
      ctx.fillStyle = C.muted;
      ctx.font = font(400, 38);
      ctx.fillText(k, L, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = color || C.text;
      ctx.font = font(700, 38);
      ctx.fillText(fitText(ctx, v, R - L - 180), R, y);
      y += 58;
    }
    row('직업', r.job);
    row('종합 등급', r.rank, gradeColor(r.rank));
    row('파티 역할', r.role);
    row('연애', r.love);

    // 구분선
    function divider() {
      y += 8;
      ctx.save();
      ctx.strokeStyle = 'rgba(79,209,255,0.35)';
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke();
      ctx.restore();
      y += 56;
    }
    divider();

    // 능력치
    r.stats.forEach(function (s) {
      ctx.textAlign = 'left';
      ctx.fillStyle = C.text;
      ctx.font = font(700, 38);
      ctx.fillText(s.label, L, y);
      var bx = L + 170, bw = R - L - 170 - 110, by = y - 22, bh = 20;
      roundRect(ctx, bx, by, bw, bh, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      var fill = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      fill.addColorStop(0, '#2a8fd6'); fill.addColorStop(1, C.line);
      roundRect(ctx, bx, by, Math.max(20, bw * s.value / 100), bh, 10);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.textAlign = 'right';
      ctx.fillStyle = gradeColor(s.grade);
      ctx.font = font(900, 42);
      ctx.fillText(s.grade, R, y + 2);
      y += 62;
    });
    divider();

    // 목록 칸
    function section(titleText, color, items, maxItems) {
      ctx.textAlign = 'left';
      ctx.fillStyle = color;
      ctx.font = font(900, 36);
      ctx.fillText(titleText, L, y);
      y += 54;
      items.slice(0, maxItems).forEach(function (it) {
        ctx.fillStyle = C.text;
        ctx.font = font(700, 34);
        ctx.fillText(fitText(ctx, '· ' + it, R - L), L, y);
        y += 50;
      });
      y += 14;
    }
    section('특성', C.green, r.buffs.map(function (b) { return b.name; }), 3);
    section('상태이상', C.red, r.debuffs.map(function (d) { return d.name; }), 2);
    section('히든 업적  [' + r.achievement.rarity + ']', C.gold, [r.achievement.name], 1);

    // 퀘스트
    ctx.textAlign = 'left';
    ctx.fillStyle = C.line;
    ctx.font = font(900, 34);
    ctx.fillText('[퀘스트]', L, y);
    ctx.fillStyle = C.text;
    ctx.font = font(400, 32);
    ctx.fillText(fitText(ctx, r.quest.text, R - L - 170), L + 160, y);

    // 바닥 문구
    ctx.textAlign = 'center';
    ctx.fillStyle = C.text;
    ctx.font = font(700, 40);
    ctx.fillText('나도 내 상태창 열어보기  ▶', W / 2, H - 82);
    if (opts.siteLabel) {
      ctx.fillStyle = C.line;
      ctx.font = font(400, 32);
      ctx.fillText(opts.siteLabel, W / 2, H - 36);
    }
    return canvas;
  }

  root.SWCard = { drawCard: drawCard, WIDTH: W, HEIGHT: H };
})(window);
