// src/main.ts
import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager } from "./core/EntityManager"; 
import { Player } from "./entities/Player";

class Game {
    private app: Application;
    private input: InputManager;
    private textures: Record<string, Texture> = {};

    private player: Player | null = null;
    private scoreManager: ScoreManager;
    private entityManager: EntityManager | null = null;

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
        this.entityManager = new EntityManager(this.app.stage, this.textures);

        // イベントリスナーを登録
        this.entityManager.on(
            EntityManager.ENEMY_DESTROYED_EVENT, // イベント名を使用
            this.handleEnemyDestroyed, // イベント発生時に呼び出すメソッド
            this // thisをGameクラスにバインド
        );

        // 2. プレイヤー生成
        this.player = new Player(
            this.textures[CONFIG.ASSETS.TEXTURES.PLAYER],
        );
        this.app.stage.addChild(this.player.sprite);

        // Playerの発射イベントを購読する
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot, this);

        // Playerの初期設定を行うためにreset()を呼び出す
        this.player.reset();

        // 3. ループ開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    // 🚀 【新規追加】Playerの"shoot"イベントを処理するハンドラ
    private handlePlayerShoot(x: number, y: number) {
         // EntityManagerに弾生成を依頼する
         this.entityManager?.spawnBullet(x, y);
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
        this.entityManager.update(delta);
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
