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
        // 1. プレイヤー生成（EntityManagerの初期化前に必要）
        this.player = new Player(
            this.textures[CONFIG.ASSETS.TEXTURES.PLAYER],
        );
        this.app.stage.addChild(this.player.sprite);

        // Playerの発射イベントを購読する
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot, this);

        // Playerの初期設定を行うためにreset()を呼び出す
        this.player.reset();
        
        // 2. EntityManagerの初期化
        // 🚀 【重要修正】Playerインスタンス(this.player)を第3引数として渡す
        // これで「3個の引数が必要ですが、2個指定されました」のエラーが解消します。
        this.entityManager = new EntityManager(this.app.stage, this.textures, this.player);

        // EntityManagerのイベントリスナーを登録
        this.entityManager.on(
            EntityManager.ENEMY_DESTROYED_EVENT,
            this.handleEnemyDestroyed,
            this // this.player ではなく this (Gameクラス) をリスナーのコンテキストとして使用
        );
        
        // ScoreManagerのイベントリスナーを登録 (ログ出力の責務を分離)
        this.scoreManager.on(
            ScoreManager.SCORE_CHANGED_EVENT,
            (newScore: number) => { 
                console.log(`Current Score: ${newScore}`); // ここでログ出力
            },
            this
        );

        // 3. ループ開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    private handlePlayerShoot(x: number, y: number) {
         this.entityManager?.spawnBullet(x, y);
    }

    private handleEnemyDestroyed() {
        // スコア加算
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    private update(ticker: Ticker) {
        if (!this.player || !this.entityManager) return;
        const delta = ticker.deltaMS / 1000;

        // 1. プレイヤー更新
        this.player.handleInput(this.input, delta);

        // 2. エンティティ全体の更新をEntityManagerに委譲
        this.entityManager.update(delta);
    }
    
    // リソースクリーンアップメソッド
    public destroy() {
        this.input.destroy(); 
        // 他のマネージャやPIXIリソースのクリーンアップを追加できます
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