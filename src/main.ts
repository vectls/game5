import { Application, Sprite, Assets, Texture } from "pixi.js";

// ==============================
// 定数
// ==============================
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPEED = 3;
const SHOT_INTERVAL_MS = 150; // 弾の発射クールダウン (150ms)
const SPAWN_INTERVAL_MS = 2000; // 敵の生成間隔 (2秒)

// ==============================
// 抽象化された関数
// ==============================

// アプリケーション作成
async function createApp() {
  const app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x000000,
  });
  document.body.appendChild(app.canvas);
  return app;
}

// ==============================
// メイン処理
// ==============================
async function main() {
  const app = await createApp();

  // JSONスプライトシートを読み込み
  const atlas = await Assets.load("sprites/sheet.json");
  const textures = atlas.textures as Record<string, Texture>;

  // 例: プレイヤー機を生成
  const player = new Sprite(textures["playerShip1_blue.png"]);
  player.x = GAME_WIDTH / 2;
  player.y = 500;
  player.anchor.set(0.5);
  app.stage.addChild(player);

  // 弾リスト
  let bullets: Sprite[] = [];
  // 敵リスト
  let enemies: Sprite[] = [];
  
  // 発射タイマー
  let lastShotTime = 0;
  // 敵生成タイマー
  let timeSinceLastSpawn = 0;

  // キー入力管理
  const keys: Record<string, boolean> = {};
  window.addEventListener("keydown", e => keys[e.code] = true);
  window.addEventListener("keyup", e => keys[e.code] = false);

  // 弾発射
  function shoot() {
    const bullet = new Sprite(textures["laserBlue07.png"]);
    bullet.x = player.x;
    bullet.y = player.y - 20;
    bullet.anchor.set(0.5);
    bullets.push(bullet);
    app.stage.addChild(bullet);
  }

  // 敵生成
  function spawnEnemy() {
    const enemy = new Sprite(textures["enemyBlack5.png"]);
    enemy.x = Math.random() * GAME_WIDTH;
    enemy.y = -20;
    enemy.anchor.set(0.5);
    enemies.push(enemy);
    app.stage.addChild(enemy);
  }

  // 当たり判定
  function checkCollision(a: Sprite, b: Sprite): boolean {
    const ab = a.getBounds();
    const bb = b.getBounds();
    
    // 矩形同士の衝突判定ロジック
    return ab.x + ab.width > bb.x &&
           ab.x < bb.x + bb.width &&
           ab.y + ab.height > bb.y &&
           ab.y < bb.y + bb.height;
  }

  // ゲームループ
  app.ticker.add((ticker) => {
    // 1. デルタタイムの取得 (フレーム間の時間)
    // PixiJSのticker.deltaTimeをそのまま利用し、速度をフレームレートに依存させないようにします。
    const delta = ticker.deltaTime;

    // 2. プレイヤー移動と弾発射の入力処理
    if (keys["ArrowLeft"] && player.x > 0) player.x -= PLAYER_SPEED * delta;
    if (keys["ArrowRight"] && player.x < GAME_WIDTH) player.x += PLAYER_SPEED * delta;
    
    // クールダウンタイマーに基づく弾発射
    const now = performance.now();
    if (keys["Space"] && now - lastShotTime > SHOT_INTERVAL_MS) {
      shoot();
      lastShotTime = now;
    }

    // 3. 敵の生成管理
    timeSinceLastSpawn += app.ticker.elapsedMS;
    if (timeSinceLastSpawn >= SPAWN_INTERVAL_MS) {
        spawnEnemy();
        timeSinceLastSpawn = 0;
    }

    // 4. 弾の移動と画面外削除
    bullets.forEach(b => b.y -= BULLET_SPEED * delta);
    
    // 画面外に出た弾をフィルタリングして削除
    bullets = bullets.filter(b => {
        if (b.y < -10) {
            app.stage.removeChild(b);
            return false;
        }
        return true;
    });

    // 5. 敵の移動と画面外削除
    enemies.forEach(e => e.y += ENEMY_SPEED * delta);
    
    // 画面外に出た敵をフィルタリングして削除
    enemies = enemies.filter(e => {
        if (e.y > GAME_HEIGHT + 10) {
            app.stage.removeChild(e);
            return false;
        }
        return true;
    });
    
    // 6. 当たり判定と衝突したオブジェクトの処理
    const bulletsToDestroy: Sprite[] = [];
    const enemiesToDestroy: Sprite[] = [];

    bullets.forEach(b => {
      enemies.forEach(e => {
        if (checkCollision(b, e)) {
          bulletsToDestroy.push(b);
          enemiesToDestroy.push(e);
        }
      });
    });

    // 削除リストを使って、メインの配列から安全に削除
    const hitBulletSet = new Set(bulletsToDestroy);
    const hitEnemySet = new Set(enemiesToDestroy);

    bullets = bullets.filter(b => {
        if (hitBulletSet.has(b)) {
            app.stage.removeChild(b);
            return false;
        }
        return true;
    });

    enemies = enemies.filter(e => {
        if (hitEnemySet.has(e)) {
            app.stage.removeChild(e);
            return false;
        }
        return true;
    });
  });
}

main();