// src/main.ts
import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager } from "./core/EntityManager"; // 🚀 新規インポート
import { Player } from "./entities/Player";

// 不要になったimportは削除
// import { ObjectPool } from "./core/ObjectPool";
// import { Bullet } from "./entities/Bullet";
// import { Enemy } from "./entities/Enemy";

class Game {
  private app: Application;
  private input: InputManager;
  private textures: Record<string, Texture> = {};

  private player: Player | null = null;
  private scoreManager: ScoreManager;
  private entityManager: EntityManager | null = null; // 🚀 EntityManagerを保持

  // 🚀 エンティティ関連のプロパティは削除されました

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
    // 1. EntityManagerの初期化
    this.entityManager = new EntityManager(
      this.app.stage,
      this.textures,
      () => this.handleEnemyDestroyed() // 敵が破壊された時のコールバックを渡す
    );

    // 2. プレイヤー生成
    this.player = new Player(
      this.textures[CONFIG.ASSETS.TEXTURES.PLAYER],
      (x, y) => this.entityManager?.spawnBullet(x, y) // 🚀 EntityManagerを経由して弾を生成
    );
    this.app.stage.addChild(this.player.sprite);

    // 3. ループ開始
    this.app.ticker.add((ticker) => this.update(ticker));
  }

  // 🚀 敵破壊時の処理 (Gameクラスの責務: スコア/ライフ処理)
  private handleEnemyDestroyed() {
    this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
  }

  private update(ticker: Ticker) {
    if (!this.player || !this.entityManager) return;
    const delta = ticker.deltaMS / 1000;

    // 1. プレイヤー更新
    this.player.handleInput(this.input, delta);

    // 2. エンティティ全体の更新をEntityManagerに委譲 (deltaを渡す)
    this.entityManager.update(delta, ticker.elapsedMS);
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