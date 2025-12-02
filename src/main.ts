import { Application, Sprite, Assets, Texture, Ticker } from "pixi.js";

// ==============================
// 1. 設定・定数 (Config)
// ==============================
const CONFIG = {
  SCREEN: { WIDTH: 800, HEIGHT: 600, BG_COLOR: 0x000000 },
  ASSETS: {
    SHEET: "sprites/sheet.json",
    TEXTURES: {
      PLAYER: "playerShip1_blue.png",
      BULLET: "laserBlue07.png",
      ENEMY: "enemyBlack5.png",
    },
  },
  PLAYER: { SPEED: 300, SHOT_INTERVAL_MS: 150 },
  BULLET: { SPEED: 600 },
  ENEMY: { SPEED: 120, SPAWN_INTERVAL_MS: 2000 },
} as const;

// ==============================
// 2. 入力管理 (Input System)
// ==============================
class InputManager {
  private keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
  }

  public isDown(code: string): boolean {
    return !!this.keys[code];
  }
}

// ==============================
// 3. エンティティ (Entities)
// ==============================

// 共通の基底クラス（必要に応じて拡張可能）
abstract class GameObject {
  public sprite: Sprite;
  public isDead: boolean = false;

  constructor(texture: Texture) {
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
  }

  abstract update(delta: number): void;

  // 矩形衝突判定
  public collidesWith(other: GameObject): boolean {
    const a = this.sprite.getBounds();
    const b = other.sprite.getBounds();
    return (
      a.x + a.width > b.x &&
      a.x < b.x + b.width &&
      a.y + a.height > b.y &&
      a.y < b.y + b.height
    );
  }
}

class Bullet extends GameObject {
  constructor(texture: Texture, x: number, y: number) {
    super(texture);
    this.sprite.x = x;
    this.sprite.y = y;
  }

  update(delta: number): void {
    this.sprite.y -= CONFIG.BULLET.SPEED * delta;
    // 画面外に出たら死亡フラグ
    if (this.sprite.y < -50) this.isDead = true;
  }
}

class Enemy extends GameObject {
  constructor(texture: Texture) {
    super(texture);
    this.sprite.x = Math.random() * CONFIG.SCREEN.WIDTH;
    this.sprite.y = -50;
  }

  update(delta: number): void {
    this.sprite.y += CONFIG.ENEMY.SPEED * delta;
    // 画面外に出たら死亡フラグ
    if (this.sprite.y > CONFIG.SCREEN.HEIGHT + 50) this.isDead = true;
  }
}

class Player extends GameObject {
  private lastShotTime = 0;
  private textures: Record<string, Texture>;
  private onShoot: (x: number, y: number) => void;

  constructor(textures: Record<string, Texture>, onShoot: (x: number, y: number) => void) {
    super(textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
    this.textures = textures;
    this.onShoot = onShoot;

    this.sprite.x = CONFIG.SCREEN.WIDTH / 2;
    this.sprite.y = 500;
  }

  update(delta: number): void {
    // 継承元のupdateではなく、InputManagerを受け取る形に変更しても良いが
    // ここでは簡易的にGameクラスから制御される想定
  }

  // 入力処理と移動ロジック
  handleInput(input: InputManager, delta: number) {
    // 移動
    if (input.isDown("ArrowLeft") && this.sprite.x > 0) {
      this.sprite.x -= CONFIG.PLAYER.SPEED * delta;
    }
    if (input.isDown("ArrowRight") && this.sprite.x < CONFIG.SCREEN.WIDTH) {
      this.sprite.x += CONFIG.PLAYER.SPEED * delta;
    }

    // 発射
    const now = performance.now();
    if (input.isDown("Space") && now - this.lastShotTime > CONFIG.PLAYER.SHOT_INTERVAL_MS) {
      this.onShoot(this.sprite.x, this.sprite.y - 20);
      this.lastShotTime = now;
    }
  }
}

// ==============================
// 4. ゲーム管理 (Game Manager)
// ==============================
class Game {
  private app: Application;
  private input: InputManager;
  private textures: Record<string, Texture> = {};
  
  private player: Player | null = null;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  
  private timeSinceLastSpawn = 0;

  constructor(app: Application) {
    this.app = app;
    this.input = new InputManager();
  }

  // 初期化とリソース読み込み
  async init() {
    const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
    this.textures = atlas.textures;
    this.createScene();
  }

  // シーン構築
  private createScene() {
    // プレイヤー生成
    this.player = new Player(this.textures, (x, y) => this.spawnBullet(x, y));
    this.app.stage.addChild(this.player.sprite);

    // ゲームループ開始
    this.app.ticker.add((ticker) => this.update(ticker));
  }

  // 弾の生成
  private spawnBullet(x: number, y: number) {
    const bullet = new Bullet(this.textures[CONFIG.ASSETS.TEXTURES.BULLET], x, y);
    this.bullets.push(bullet);
    this.app.stage.addChild(bullet.sprite);
  }

  // 敵の生成
  private spawnEnemy() {
    const enemy = new Enemy(this.textures[CONFIG.ASSETS.TEXTURES.ENEMY]);
    this.enemies.push(enemy);
    this.app.stage.addChild(enemy.sprite);
  }

  // メインループ
  private update(ticker: Ticker) {
    if (!this.player) return;

    const delta = ticker.deltaMS / 1000;

    // 1. プレイヤー制御
    this.player.handleInput(this.input, delta);

    // 2. 敵のスポーン管理
    this.timeSinceLastSpawn += ticker.elapsedMS;
    if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
      this.spawnEnemy();
      this.timeSinceLastSpawn = 0;
    }

    // 3. オブジェクト更新（移動など）
    this.bullets.forEach(b => b.update(delta));
    this.enemies.forEach(e => e.update(delta));

    // 4. 当たり判定処理
    this.handleCollisions();

    // 5. 不要なオブジェクトの掃除
    this.cleanup();
  }

  private handleCollisions() {
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (!b.isDead && !e.isDead && b.collidesWith(e)) {
          b.isDead = true;
          e.isDead = true;
          // ここで爆発エフェクトやスコア加算を追加可能
        }
      }
    }
  }

  private cleanup() {
    // 弾の削除
    this.bullets = this.bullets.filter(b => {
      if (b.isDead) {
        this.app.stage.removeChild(b.sprite);
        return false;
      }
      return true;
    });

    // 敵の削除
    this.enemies = this.enemies.filter(e => {
      if (e.isDead) {
        this.app.stage.removeChild(e.sprite);
        return false;
      }
      return true;
    });
  }
}

// ==============================
// 5. エントリーポイント
// ==============================
async function main() {
  const app = new Application();
  await app.init({
    width: CONFIG.SCREEN.WIDTH,
    height: CONFIG.SCREEN.HEIGHT,
    backgroundColor: CONFIG.SCREEN.BG_COLOR,
  });
  document.body.appendChild(app.canvas);

  const game = new Game(app);
  await game.init();
}

main();