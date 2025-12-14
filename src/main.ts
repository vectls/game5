// src/main.ts

import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager, ENTITY_KEYS } from "./core/EntityManager";
import { Player } from "./entities/Player";
// 🚀 修正 1: TrajectoryOption の型をインポート
import type { ScaleOption, SpeedOption, ShotSpec, TrajectoryOption } from "./types/ShotTypes";

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
        this.textures = atlas.textures as Record<string, Texture>;
        this.createScene();
    }

    private createScene() {
        // 1. プレイヤー生成
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);

        // プレイヤーの初期位置と可視性を設定するために reset() を呼び出す
        this.player.reset();

        // 2. スコアマネージャー、エンティティマネージャーの生成
        this.entityManager = new EntityManager(
            this.app.stage,
            this.textures,
            this.player
        );
        
        // EntityManagerのオブジェクトプールを初期化
        this.entityManager.setup(this.textures); 

        // Playerの発射イベントを購読する
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot.bind(this));
        // スコア更新イベントを購読する
        this.entityManager.on(
            EntityManager.ENEMY_DESTROYED_EVENT,
            this.handleEnemyDestroyed.bind(this)
        );

        // 3. メインループの開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    // 🚀 修正 2: trajectoryOpt と initialAngleDeg を引数に追加
    private handlePlayerShoot(
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string,
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null,
        trajectoryOpt: TrajectoryOption | null,   // 【新規】軌道オプション
        initialAngleDeg: number,                  // 【新規】初速角度
        onDeathShotSpec: ShotSpec | null
    ) {
        const entityManager = this.entityManager;
        if (!entityManager) return;

        // 🚀 修正 3: 新しい引数を spawn メソッドに渡す
        entityManager.spawn(
            ENTITY_KEYS.BULLET,
            x,
            y,
            velX,
            velY,
            textureKey,
            scaleOpt,
            speedOpt,
            trajectoryOpt,   // 【新規】
            initialAngleDeg, // 【新規】
            onDeathShotSpec
        );
    }

    private handleEnemyDestroyed() {
        // スコア加算
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    private update(ticker: Ticker) {
        if (!this.player || !this.entityManager) return;
        // deltaは秒に変換
        const delta = ticker.deltaMS / 1000;

        // 1. プレイヤー更新（入力処理と内部タイマーの更新）
        // 🚀 修正: Playerの入力処理をメインループで明示的に呼び出し、弾が発射されない問題を解消
        this.player.handleInput(this.input, delta); 
        this.player.update(delta);

        // 2. エンティティ全体の更新
        this.entityManager.update(delta);
    }

    // リソースクリーンアップメソッド
    public destroy() {
        this.input.destroy();
        this.app.destroy();
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
    await game.init(); // initを呼び出し
}

main();