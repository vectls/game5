// src/main.ts
import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ObjectPool } from "./core/ObjectPool";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Enemy } from "./entities/Enemy";
import { Explosion } from "./entities/Explosion";
import { ScoreManager } from "./core/ScoreManager";

class Game {
  private app: Application;
  private input: InputManager;
  private textures: Record<string, Texture> = {};

  private player: Player | null = null;
  
  private bulletPool: ObjectPool<Bullet> | null = null;
  private enemyPool: ObjectPool<Enemy> | null = null;
  private explosionPool: ObjectPool<Explosion> | null = null; // 🚀 Explosion Poolを追加

  // 現在画面上に存在して更新が必要なリスト
  private activeBullets: Bullet[] = [];
  private activeEnemies: Enemy[] = [];
  private activeExplosions: Explosion[] = [];

  private timeSinceLastSpawn = 0;

  private scoreManager: ScoreManager; // 🚀 スコアマネージャーを追加

  constructor(app: Application) {
    this.app = app;
    this.input = new InputManager();
    this.scoreManager = new ScoreManager();
  }

  async init() {
    const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
    this.textures = atlas.textures;
    this.createScene();
  }

  private createScene() {
    // 1. プールの初期化
    this.bulletPool = new ObjectPool<Bullet>(
        () => {
            const b = new Bullet(this.textures[CONFIG.ASSETS.TEXTURES.BULLET]);
            this.app.stage.addChild(b.sprite);
            return b;
        }, 
        CONFIG.BULLET.POOL_SIZE
    );

    this.enemyPool = new ObjectPool<Enemy>(
        () => {
            const e = new Enemy(this.textures[CONFIG.ASSETS.TEXTURES.ENEMY]);
            this.app.stage.addChild(e.sprite);
            return e;
        }, 
        CONFIG.ENEMY.POOL_SIZE
    );

    // 🚀 Explosion Poolの初期化
    this.explosionPool = new ObjectPool<Explosion>(
        () => {
            const e = new Explosion(this.textures[CONFIG.ASSETS.TEXTURES.EXPLOSION]);
            this.app.stage.addChild(e.sprite);
            return e;
        }, 
        CONFIG.EXPLOSION.POOL_SIZE
    );

    // 2. プレイヤー生成
    this.player = new Player(
      this.textures[CONFIG.ASSETS.TEXTURES.PLAYER],
      (x, y) => this.spawnBullet(x, y)
    );
    this.app.stage.addChild(this.player.sprite);

    // 3. ループ開始
    this.app.ticker.add((ticker) => this.update(ticker));
  }

  private spawnBullet(x: number, y: number) {
    if (!this.bulletPool) return;
    const bullet = this.bulletPool.get(x, y);
    this.activeBullets.push(bullet);
  }

  private spawnEnemy() {
    if (!this.enemyPool) return;
    const enemy = this.enemyPool.get();
    this.activeEnemies.push(enemy);
  }

  private spawnExplosion(x: number, y: number) {
    if (!this.explosionPool) return;
    const explosion = this.explosionPool.get(x, y);
    this.activeExplosions.push(explosion);
  }

  private update(ticker: Ticker) {
    if (!this.player) return;
    // deltaMSはPixiの仕様で、秒換算で利用するために1000で割る
    const delta = ticker.deltaMS / 1000;

    // 1. プレイヤー更新
    this.player.handleInput(this.input, delta);

    // 2. 敵スポーン
    this.timeSinceLastSpawn += ticker.elapsedMS;
    if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
      this.spawnEnemy();
      this.timeSinceLastSpawn = 0;
    }

    // 3. オブジェクト更新
    this.activeBullets.forEach(b => b.update(delta));
    this.activeEnemies.forEach(e => e.update(delta));
    this.activeExplosions.forEach(ex => ex.update(delta));

    // 4. 当たり判定
    this.handleCollisions();

    // 5. クリーンアップ
    this.cleanup();
  }

  private handleCollisions() {
    for (const b of this.activeBullets) {
      if (!b.active) continue;

      for (const e of this.activeEnemies) {
        if (!e.active) continue;

        if (b.collidesWith(e)) {
          b.active = false;
          e.active = false;

          // 🚀 爆発を生成
          this.spawnExplosion(e.sprite.x, e.sprite.y);

          // 🚀 スコアを加算
          this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
        }
      }
    }
  }

  private cleanup() {
    if (this.bulletPool) {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            if (!b.active) {
                this.bulletPool.release(b);
                this.activeBullets.splice(i, 1);
            }
        }
    }

    if (this.enemyPool) {
        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
            const e = this.activeEnemies[i];
            if (!e.active) {
                this.enemyPool.release(e);
                this.activeEnemies.splice(i, 1);
            }
        }
    }

    // 🚀 Explosion Poolのクリーンアップ
    if (this.explosionPool) {
        for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
            const ex = this.activeExplosions[i];
            if (!ex.active) {
                this.explosionPool.release(ex);
                this.activeExplosions.splice(i, 1);
            }
        }
    }
  }
}

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
