// src/main.ts
import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager, ENTITY_KEYS } from "./core/EntityManager";
import { Player } from "./entities/Player";
import type { ScaleOption, SpeedOption } from "./types/ShotTypes";

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
        // アセットのロード
        const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
        this.textures = atlas.textures;
        this.createScene();
    }

    private createScene() {
        // 1. プレイヤー生成
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);

        // Playerの発射イベントを購読する
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot, this); // 修正は不要

        this.player.reset();

        // 2. EntityManagerの初期化
        // Playerインスタンスを渡す
        this.entityManager = new EntityManager(
            this.app.stage,
            this.textures,
            this.player
        );

        // EntityManagerのイベントリスナーを登録
        this.entityManager.on(
            EntityManager.ENEMY_DESTROYED_EVENT,
            this.handleEnemyDestroyed,
            this
        );

        // ScoreManagerのイベントリスナーを登録
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

    /**
     * PlayerのSHOOT_EVENTハンドラ
     * Bulletの初期速度、サイズ変化オプション、速度変化オプションを受け取り、EntityManagerに弾丸の生成を依頼する
     */
    private handlePlayerShoot(
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string, // 💡 修正: textureKeyを受け取る
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null // 🚀 速度変化オプション
    ) {
        // 💡 修正: this.entityManagerがnullでないことを保証し、型をEntityManagerに絞り込む
        const entityManager = this.entityManager;
        if (!entityManager) return; // nullチェック

        // 💡 修正: 正しい引数順序で spawn を呼び出す
        entityManager.spawn(
            ENTITY_KEYS.BULLET, 
            x, y, 
            velX, velY, 
            textureKey, // 💡 textureKeyを渡す
            scaleOpt,   
            speedOpt
        );
    }
    private handleEnemyDestroyed() {
        // スコア加算
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    private update(ticker: Ticker) {
        if (!this.player || !this.entityManager) return;
        const delta = ticker.deltaMS / 1000; // 秒に変換

        // 1. プレイヤー更新（入力処理と内部タイマーの更新）
        this.player.handleInput(this.input, delta);
        this.player.update(delta); // 波状ショット等のタイマーを更新

        // 2. エンティティ全体の更新
        this.entityManager.update(delta);
    }

    // リソースクリーンアップメソッド
    public destroy() {
        this.input.destroy();
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