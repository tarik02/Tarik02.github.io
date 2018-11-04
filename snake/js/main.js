const WIDTH = 92;
const HEIGHT = 66;
const UPDATE_INTERVAL = 1000 / 35;
const aa = 0.1;
let tileSize = 1;
let ctx;
let levelNumber = 1;
const scoreEls = [
  document.getElementById('score0'),
  document.getElementById('score1'),
  document.getElementById('score2'),
  document.getElementById('score3'),
  document.getElementById('score4'),
  document.getElementById('score5'),
];

let waiting = [];

const image = src => {
  const img = new Image();
  img.src = src;
  waiting.push(new Promise(resolve => img.onload = resolve));
  return img;
};

const sound = src => {
  const audio = new Audio();
  audio.src = src;
  return {
    play: () => audio.cloneNode().play()
  };
};

const deadend_board = Array(WIDTH * HEIGHT);
let deadend_runnumber = 0;

const c = (x, y) => y * WIDTH + x;
const uc = v => [v % WIDTH, Math.floor(v / WIDTH)];
const move = (x, y, d) => {
  switch (d) {
  case 'u': --y; if (y < 0) y = HEIGHT - 1; break;
  case 'd': ++y; if (y >= HEIGHT) y = 0; break;
  case 'l': --x; if (x < 0) x = WIDTH - 1; break;
  case 'r': ++x; if (x >= WIDTH) x = 0; break;
  }
  return [x, y];
};
const dOpp = d => ({ u: 'd', d: 'u', l: 'r', r: 'l' })[d];
const dLeft = d => ({ u: 'l', d: 'r', l: 'd', r: 'u' })[d];
const dRight = d => ({ u: 'r', d: 'l', l: 'u', r: 'ud' })[d];

const TILES = {
  'b': image('./img/wall/wall-straight-up.svg'),
  'c': image('./img/wall/wall-straight-side.svg'),
  'd': image('./img/wall/wall-corner-bottom-left.svg'),
  'e': image('./img/wall/wall-corner-bottom-right.svg'),
  'f': image('./img/wall/wall-corner-top-left.svg'),
  'g': image('./img/wall/wall-corner-top-right.svg'),
  'h': image('./img/wall/wall-tee-up.svg'),
  'i': image('./img/wall/wall-tee-right.svg'),
  'j': image('./img/wall/wall-tee-left.svg'),
  'k': image('./img/wall/wall-tee-down.svg'),
  'l': image('./img/wall/wall-cross.svg'),
  'W': image('./img/other/questionmark.svg'),
};

const SNAKES = [
  image('./img/snake/snake-red.svg'),
  image('./img/snake/snake-green.svg'),
  image('./img/snake/snake-blue.svg'),
  image('./img/snake/snake-yellow.svg'),
  image('./img/snake/snake-cyan.svg'),
  image('./img/snake/snake-magenta.svg'),
];

const SOUNDS = {
  crash: sound('./sounds/crash.ogg'),
  teleport: sound('./sounds/teleport.ogg'),
  gameover: sound('./sounds/gameover.ogg'),
  reverse: sound('./sounds/reverse.ogg'),
  bonus: sound('./sounds/bonus.ogg'),
  life: sound('./sounds/life.ogg'),
  appear: sound('./sounds/appear.ogg'),
};

const BONUSES = {
  regular: image('./img/other/bonus1.svg'),
  half: image('./img/other/bonus2.svg'),
  double: image('./img/other/bonus3.svg'),
  life: image('./img/other/life.svg'),
  reverse: image('./img/other/diamond.svg'),
};

const canMoveTo = tile => tile === ' ' || tile === 'W' || !!BONUSES[tile];

class Worm {
  constructor(level, index) {
    this.level = level;
    this.index = index;
    this.lives = 5;
    this.score = 0;
  }

  respawn() {
    this.spawn();
    this.dir = 'udlr'[Math.floor(Math.random() * 4)];
  }

  spawn() {
    this.list = [this.start, this.start, this.start, this.start];
    for (const i of this.list) {
      this.level.board[i] = 'z';
      this.renderAdd(...uc(i));
    }
  }

  despawn() {
    for (const i of this.list) {
      if (this.level.board[i] === 'z') {
        this.level.board[i] = ' ';
        this.renderRemove(...uc(i));
      }
    }
    this.list = [];
  }

  get tail() {
    return this.list[0];
  }

  get head() {
    return this.list[this.list.length - 1];
  }

  get x() {
    return uc(this.head)[0];
  }
  get y() {
    return uc(this.head)[1];
  }

  kill() {
    SOUNDS.crash.play();
    this.despawn();
    this.lives--;
  }

  ai() {
    const opp = dOpp(this.dir);

    if (!this.aiFind(this.x, this.y, this.dir, this.x, this.y)) {
      if (this.aiFind(this.x, this.y, dLeft(this.dir), this.x, this.y)) {
        this.dir = dLeft(this.dir);
      } else if (this.aiFind(this.x, this.y, dRight(this.dir), this.x, this.y)) {
        this.dir = dRight(this.dir);
      } else if (Math.round(Math.random() * 30) === 1) {
        this.dir = Math.random() < 0.5 ? dLeft(this.dir) : dRight(this.dir);
      }
    }

    let prev_dir = this.dir;
    let best_dir = null;
    let best_yet = WIDTH * HEIGHT * 2;

    for (let dir of Array.from('rdlu')) {
      if (dir == opp) continue;
      let this_len = 0;

      let [tx, ty] = move(this.x, this.y, dir);

      if (!canMoveTo(this.level.board[c(tx, ty)])) {
        this_len += WIDTH * HEIGHT;
      }

      if (this.aiTooClose()) {
        this_len += 4;
      }

      this_len += this.aiDeadendAfter(this.x, this.y, this.dir, this.list.length);

      if (dir === prev_dir && this_len <= 0) {
        this_len -= 100;
      }
      if (this_len <= 0) {
        this_len -= Math.random() * 100;
      }
      if (this_len < best_yet) {
        best_yet = this_len;
        best_dir = dir;
      }
    }

    this.dir = best_dir || this.dir;

    for (let dir of Array.from('rdlu')) {
      if (dir == opp) continue;

      let [tx, ty] = move(this.x, this.y, this.dir);
      if (!canMoveTo(this.level.board[c(tx, ty)])) {
        this.dir = dir;
      }
    }
  }

  aiDeadend(x, y, length_left) {
    if (length_left <= 0) return 0;

    for (let dir = 3; dir >= 0; dir--) {
      const [nx, ny] = move(x, y, 'rdlu'[dir]);

      if (canMoveTo(this.level.board[c(nx, ny)]) && (deadend_board[c(nx, ny)] != deadend_runnumber)) {
        deadend_board[c(nx, ny)] = deadend_runnumber;
        length_left = this.aiDeadend(nx, ny, length_left - 1);
        if (length_left <= 0) {
          return 0;
        }
      }
    }

    return length_left;
  }

  aiDeadendAfter(ox, oy, dir, length) {
    if (ox >= WIDTH || oy >= HEIGHT) return 0;

    ++deadend_runnumber;
    for (const oth of this.level.worms) {
      if (oth === this) continue;
      const [target_x, target_y] = uc(oth.head);
      if (target_x > 0)           deadend_board[c(target_x - 1, target_y    )] = deadend_runnumber;
      else                        deadend_board[c(WIDTH    - 1, target_y    )] = deadend_runnumber;
      if (target_y > 0)           deadend_board[c(target_x    , target_y - 1)] = deadend_runnumber;
      else                        deadend_board[c(target_x    , HEIGHT   - 1)] = deadend_runnumber;
      if (target_x < WIDTH - 1)   deadend_board[c(target_x + 1, target_y    )] = deadend_runnumber;
      else                        deadend_board[c(0           , target_y    )] = deadend_runnumber;
      if (target_y < HEIGHT - 1)  deadend_board[c(target_x    , target_y + 1)] = deadend_runnumber;
      else                        deadend_board[c(target_x    , 0           )] = deadend_runnumber;
    }

    const [nx, ny] = move(ox, oy, dir);
    deadend_board[c(ox, oy)] = deadend_runnumber;
    deadend_board[c(nx, ny)] = deadend_runnumber;

    let cl = Math.round((length * length) / 16);
    if (cl < WIDTH)
        cl = WIDTH;
    return this.aiDeadend(nx, ny, cl);
  }

  aiTooClose() {
    const [x, y] = uc(this.head);
    for (const o of this.level.worms) {
      if (o === this) continue;

      const [ox, oy] = uc(o.head);
      const dx = x - ox;
      const dy = y - oy;
      switch (this.dir) {
        case 'u':
          if (dy > 0 && dy <= 3 && dx >= -1 && dx <= 1) return true;
          break;
        case 'd':
          if (dy < 0 && dy >= -3 && dx >= -1 && dx <= 1) return true;
          break;
        case 'l':
          if (dx > 0 && dx <= 3 && dy >= -1 && dy <= 1) return true;
          break;
        case 'r':
          if (dx < 0 && dx >= -3 && dy >= -1 && dy <= 1) return true;
          break;
      }
    }
    return false;
  }

  aiFind(x, y, dir, sx, sy) {
    [x, y] = move(x, y, dir);

    const tile = this.level.board[c(x, y)];
    switch (tile) {
      case 'regular':
      case 'double':
      case 'life':
      case 'reverse':
        return true;
      case 'half':
        return false;
      default:
        if (!canMoveTo(tile)) {
          return false;
        }
        return this.aiFind(x, y, dir, sx, sy);
    }
  }

  render() {
    for (const coord of this.list) {
      const [x, y] = uc(coord);
      this.renderAdd(x, y);
    }
  }

  renderAdd(x, y) {
    ctx.drawImage(SNAKES[this.index], x * tileSize - aa, y * tileSize - aa, tileSize + aa*2, tileSize + aa*2);
  }

  renderRemove(x, y) {
    ctx.clearRect(x * tileSize - aa*2, y * tileSize - aa*2, tileSize + 4*aa, tileSize + 4*aa);
  }
}

class Bonus {
  constructor(type, x, y, ttl) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.ttl = ttl;
  }

  take(level, worm) {
    if (this.ttl < 0) {
      return;
    }
    this.ttl = -5;

    switch (this.type) {
      case 'regular':
        worm.list.unshift(
          ...Array(5).fill(worm.tail)
        );
        worm.score += 8;
        if (--level.regularLeft !== 0) {
          level.addBonus('regular', 300);
        }
        SOUNDS.bonus.play();
        break;

      case 'double':
        worm.score += worm.list.length * 2;
        worm.list.unshift(
          ...Array(worm.list.length).fill(worm.tail)
        );
        SOUNDS.bonus.play();
        break;

      case 'half':
        worm.score -= 4;
        SOUNDS.crash.play();
        break;

      case 'life':
        worm.lives++;
        worm.score += 10;
        SOUNDS.life.play();
        break;

      case 'reverse':
        SOUNDS.reverse.play();
        worm.score += 5;
        for (const other of level.worms) {
          if (other !== worm) {
            other.list.reverse();
            other.dir = dOpp(other.dir);
          }
        }
    }
  }

  update(level) {
    if (--this.ttl === 0) {
      this.remove(level);
    }
  }

  add(level) {
    level.board[c(this.x, this.y)] = this.type;
    level.board[c(this.x + 1, this.y)] = this.type;
    level.board[c(this.x, this.y + 1)] = this.type;
    level.board[c(this.x + 1, this.y + 1)] = this.type;
    this.renderAdd();
  }

  remove(level) {
    level.board[c(this.x, this.y)] = ' ';
    level.board[c(this.x + 1, this.y)] = ' ';
    level.board[c(this.x, this.y + 1)] = ' ';
    level.board[c(this.x + 1, this.y + 1)] = ' ';
    this.renderRemove();
  }

  renderAdd() {
    ctx.drawImage(BONUSES[this.type], this.x * tileSize - aa, this.y * tileSize - aa, tileSize * 2 + aa, tileSize * 2 + aa);
  }

  renderRemove() {
    ctx.clearRect(this.x * tileSize - aa, this.y * tileSize - aa, tileSize * 2 + aa, tileSize * 2 + aa);
  }
}

class Level {
  constructor() {
    this.running = false;
    this.worms = [
      new Worm(this, 0),
      new Worm(this, 1),
      new Worm(this, 2),
      new Worm(this, 3),
      new Worm(this, 4),
      new Worm(this, 5),
    ];

    this.reset();
  }

  reset() {
    this.warps = {};
    this.warp_targets = {};
    this.bonuses = [];
    this.regularLeft = 11;
    this.nextBad = Math.round(30 + 50 * Math.random());
  }

  place() {
    this.reset();

    for (const worm of this.worms) {
      if (worm.lives > 0) {
        worm.spawn();
      }
    }

    level.addBonus('regular', 300);
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  addBonus(type, ttl) {
    let x, y;
    retry: while (true) {
      x = Math.floor(Math.random() * (WIDTH - 1));
      y = Math.floor(Math.random() * (HEIGHT - 1));

      const coll = [
        c(x, y),
        c(x + 1, y),
        c(x, y + 1),
        c(x + 1, y + 1)
      ];

      for (const p of coll) {
        if (this.board[p] !== ' ') {
          continue retry;
        }
      }

      for (const worm of this.worms) {
        for (const p of coll) {
          if (worm.list.includes(p)) {
            continue retry;
          }
        }
      }

      break;
    }

    const bonus = new Bonus(type, x, y, ttl);
    bonus.add(this);
    this.bonuses.push(
      bonus
    );

    SOUNDS.appear.play();
  }

  update() {
    if (!this.running) {
      return;
    }
    for (const worm of this.worms) {
      if (worm.index !== 0)
      worm.ai(this);
    }
    const toKill = [];
    c: for (const worm of this.worms) {
      if (worm.list.length > 0) {
        let [x, y] = uc(worm.head);

        const tile = this.board[c(x, y)];
        if (tile !== ' ' && tile !== 'W' && tile !== 'z') {
          toKill.push(worm);
          continue c;
        }

        let shifted = worm.list.shift();
        if (!worm.list.includes(shifted)) {
          if (this.board[shifted] === 'z') {
            this.board[shifted] = ' ';
          }
          worm.renderRemove(...uc(shifted));
        }
        [x, y] = move(x, y, worm.dir);

        if (this.board[c(x, y)] === 'W') {
          if (this.warps[c(x, y)] && this.warp_targets[this.warps[c(x, y)]]) {
            const t = this.warp_targets[this.warps[c(x, y)]].filter(t => {
              const [ox, oy] = uc(t);
              return Math.abs(x - ox) > 5 && Math.abs(y - oy) > 5;
            })[0];
            if (t) {
              SOUNDS.teleport.play();
              [x, y] = uc(t);
            }
          }
        }

        if (this.board[c(x, y)] === 'z') {
          for (const other of this.worms) {
            if (worm === other) {
              if (other.list.filter(o => o === c(x, y)).length === 1) {
                toKill.push(worm);
                continue c;
              }
            } else if (other.list.includes(c(x, y))) {
              toKill.push(worm);
              continue c;
            }
          }
        }

        for (const bonus of this.bonuses) {
          if (
            x >= bonus.x && x <= bonus.x + 1 &&
            y >= bonus.y && y <= bonus.y + 1
          ) {
            bonus.take(this, worm);
            bonus.remove(this);
          }
        }

        if (this.board[c(x, y)] === ' ') {
          this.board[c(x, y)] = 'z';
          if (!worm.list.includes(c(x, y))) {
            worm.renderAdd(x, y);
          }
        }
        worm.list.push(c(x, y));
      }
    }
    for (const worm of toKill) {
      worm.kill();
      if (worm.lives > 0) {
        worm.respawn();
      }
    }
    --this.nextBad;
    if (--this.nextBad < 0) {
      const rand = 20 * Math.random();
      if (rand <= 9) {
        this.addBonus('half', 200);
        this.nextBad = 200 + Math.round(Math.random() * 30);
      } else if (rand <= 14) {
        this.addBonus('double', 150);
        this.nextBad = 150 + Math.round(Math.random() * 30);
      } else if (rand <= 15) {
        this.addBonus('life', 100);
        this.nextBad = 100 + Math.round(Math.random() * 30);
      } else {
        this.addBonus('reverse', 150);
        this.nextBad = 150 + Math.round(Math.random() * 30);
      }
    }
    for (const bonus of this.bonuses) {
      bonus.update(this);
    }
    this.bonuses = this.bonuses.filter(bonus => bonus.ttl > 0);
  }

  /**
   * @param {CanvasRenderingContext2D} canvas
   * @param {*} width
   * @param {*} height
   */
  render(canvas, width, height) {
    if (!this.board) {
      return;
    }

    this.width = width;
    this.height = height;
    tileSize = Math.floor(Math.min(width / WIDTH, height / HEIGHT));
  }

  initialRender() {
    this.doRender(() => {
      for (let y = 0; y < HEIGHT; ++y) {
        for (let x = 0; x < WIDTH; ++x) {
          const tile = this.board[c(x, y)];
          if (tile === ' ' || tile === 'z' || BONUSES[tile]) {
            continue;
          }
          ctx.drawImage(TILES[tile] || TILES['w'], x * tileSize - aa, y * tileSize - aa, tileSize + aa, tileSize + aa);
        }
      }

      if (this.running) {
        for (const worm of this.worms) {
          worm.render();
        }

        for (const bonus of this.bonuses) {
          bonus.renderAdd();
        }
      }
    });
  }

  renderDebug() {
    this.doRender(() => {
      ctx.fillStyle = 'white';
      ctx.font = '3px arial';
      for (let y = 0; y < HEIGHT; ++y) {
        for (let x = 0; x < WIDTH; ++x) {
          const tile = this.board[c(x, y)];
          ctx.fillText(tile, x * tileSize - aa + 5, y * tileSize - aa + 5);
        }
      }
    });
  }

  doRender(cb) {
    ctx.save();
    ctx.translate((this.width - tileSize * WIDTH) / 2, (this.height - tileSize * HEIGHT) / 2);

    cb();

    ctx.restore();
  }
}

const canvas = document.getElementById('canvas');
/** @type {CanvasRenderingContext2D} */
ctx = canvas.getContext('2d');
const level = new Level();


const mainLoop = () => {
  level.doRender(() => {
    level.update();

    for (const worm of level.worms) {
      scoreEls[worm.index].innerHTML = `Гравець №${worm.index+1}<br>Життів: ${worm.lives}<br>Рахунок: ${worm.score}`;
    }
  });

  if (level.worms[0].lives === 0) {
    const $el = document.createElement('div');
    $el.className = 'dialog';
    $el.innerText = `Ви програли. Ваш рахунок: ${ level.worms[0].score }`;

    const $btn = document.createElement('button');
    $btn.innerText = 'Зіграти ще раз';
    $btn.onclick = () => document.location.reload();
    $el.appendChild($btn);
    document.body.appendChild($el);

    SOUNDS.gameover.play();

    return;
  }

  if (level.regularLeft > 0) {
    setTimeout(mainLoop, 140);
  } else {
    ++levelNumber;
    level.stop();

    if (levelNumber === 27) {
      const $el = document.createElement('div');
      $el.className = 'dialog';
      $el.innerText = `Ви перемогли! Вітаємо! Ваш рахунок: ${ level.worms[0].score }`;

      const $btn = document.createElement('button');
      $btn.innerText = 'Зіграти ще раз';
      $btn.onclick = () => document.location.reload();
      $el.appendChild($btn);
      document.body.appendChild($el);

      SOUNDS.gameover.play();

      return;
    }

    loadBoard(`./levels/level${ String(levelNumber).padStart(3, '0') }.gnl`).then(() => {
      requestAnimationFrame(() => {
        canvas.width = window.innerWidth;
        level.initialRender();

        level.doRender(() => {
          level.place();
        });

        setTimeout(() => {
          level.doRender(() => {
            level.start();
          });
        }, 500);

        onRender();
        mainLoop();
      });
    });
  }
};

const onRender = () => {
  requestAnimationFrame(onRender);
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight - 150) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 150;
    level.render(ctx, canvas.width, canvas.height);
    level.initialRender();
  }

  // level.renderDebug();
};

const loadBoard = async name => {
  const data = await fetch(name).then(res => res.text());

  const board = [];
  board.length = WIDTH * HEIGHT;
  board.fill(' ');

  level.warps = {};
  level.warp_targets = {};

  let wc = 0;
  let y = 0;
  for (const row of data.trim().split('\n')) {
    let x = 0;
    for (const tile of row.split('')) {
      switch (tile) {
        case '▲': case 'm': {
          const worm = level.worms[wc++];
          worm.dir = 'u';
          worm.start = c(x, y);
          break;
        }
        case '◀': case 'n': {
          const worm = level.worms[wc++];
          worm.dir = 'l';
          worm.start = c(x, y);
          break;
        }
        case '▼': case 'o': {
          const worm = level.worms[wc++];
          worm.dir = 'd';
          worm.start = c(x, y);
          break;
        }
        case '▶': case 'p': {
          const worm = level.worms[wc++];
          worm.dir = 'r';
          worm.start = c(x, y);
          break;
        }
        case '┃': board[c(x, y)] = 'b'; break;
        case '━': board[c(x, y)] = 'c'; break;
        case '┗': board[c(x, y)] = 'd'; break;
        case '┛': board[c(x, y)] = 'e'; break;
        case '┏': board[c(x, y)] = 'f'; break;
        case '┓': board[c(x, y)] = 'g'; break;
        case '┻': board[c(x, y)] = 'h'; break;
        case '┣': board[c(x, y)] = 'i'; break;
        case '┫': board[c(x, y)] = 'j'; break;
        case '┳': board[c(x, y)] = 'k'; break;
        case '╋': board[c(x, y)] = 'l'; break;
        case 'R': case 'S': case 'T': case 'U': case 'V': case 'W': case 'X': case 'Y': case 'Z':
          board[c(x, y)] = 'W';

          level.warps[c(x, y)] = tile;

          if (!level.warp_targets[tile]) {
            level.warp_targets[tile] = [c(x, y)];
          } else {
            level.warp_targets[tile].push(c(x, y));
          }
          // warp source
          break;
        case 'r': case 's': case 't': case 'u': case 'v': case 'w': case 'x': case 'y': case 'z':
          // warp target
          level.warp_targets[tile] = [c(x, y)];
          break;
      }
      ++x;
    }
    ++y;
  }

  level.board = board;
};

window.addEventListener('keydown', event => {
  switch (event.key) {
    case 'ArrowUp': if (level.worms[0].dir !== 'd') level.worms[0].dir = 'u'; break;
    case 'ArrowDown': if (level.worms[0].dir !== 'u') level.worms[0].dir = 'd'; break;
    case 'ArrowLeft': if (level.worms[0].dir !== 'r') level.worms[0].dir = 'l'; break;
    case 'ArrowRight': if (level.worms[0].dir !== 'l') level.worms[0].dir = 'r'; break;
  }
});

Promise.all(waiting).then(loadBoard('./levels/level001.gnl')).then(() => {
  requestAnimationFrame(() => {
    level.place();
    level.start();

    onRender();
    mainLoop();
  });
});
