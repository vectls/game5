// src/main.ts

import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";

// Core modules
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager, ENTITY_KEYS } from "./core/EntityManager";

// Entities
import { Player } from "./entities/Player";

// Types
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

    /** 初期化処理 */
    async init() {
        const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
        this.textures = atlas.textures as Record<string, Texture>;
        this.createScene();
    }

    /** ゲームシーンの構築 */
    private createScene() {
        // プレイヤー生成
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);
        this.player.reset();

        // エンティティ管理
        this.entityManager = new EntityManager(this.app.stage, this.textures, this.player);
        this.entityManager.setup(this.textures);

        // イベント購読
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot.bind(this));
        this.entityManager.on(EntityManager.ENEMY_DESTROYED_EVENT, this.handleEnemyDestroyed.bind(this));

        // メインループ開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    /** プレイヤーの発射処理 */
    private handlePlayerShoot(
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string,
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null,
        trajectoryOpt: TrajectoryOption | null,
        initialAngleDeg: number,
        onDeathShotSpec: ShotSpec | null
    ) {
        if (!this.entityManager) return;

        this.entityManager.spawn(
            ENTITY_KEYS.BULLET,
            x,
            y,
            velX,
            velY,
            textureKey,
            scaleOpt,
            speedOpt,
            trajectoryOpt,
            initialAngleDeg,
            onDeathShotSpec
        );
    }

    /** 敵撃破時のスコア加算 */
    private handleEnemyDestroyed() {
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    /** 毎フレーム更新処理 */
    private update(ticker: Ticker) {
        if (!this.player || !this.entityManager) return;

        const delta = ticker.deltaMS / 1000;

        this.player.handleInput(this.input, delta);
        this.player.update(delta);

        this.entityManager.update(delta);
    }

    /** リソース解放 */
    public destroy() {
        this.input.destroy();
        this.app.destroy();
    }
}

/** エントリーポイント */
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