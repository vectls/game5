// src/main.ts

import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";

// Core modules
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager } from "./core/EntityManager";

// Entities
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

    /** 初期化処理 (アセットロード後にシーン構築を呼び出す) */
    async init() {
        const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
        this.textures = atlas.textures as Record<string, Texture>;
        this.createScene();
    }

    /** ゲームシーンの構築 (全体の流れを定義) */
    private createScene() {
        // 責務ごとに処理を分割し、高レベルの処理の流れを明確にする
        this._createPlayer();
        this._createEntityManager();
        this._subscribeEvents();

        // メインループ開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    /** プレイヤーの生成と初期化を担当 */
    private _createPlayer() {
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);
        this.player.reset();
    }
    
    /** エンティティマネージャーの生成と初期化を担当 */
    private _createEntityManager() {
        // Playerが初期化済みであることを前提とする
        if (!this.player) throw new Error("Player must be initialized before EntityManager.");
        
        this.entityManager = new EntityManager(
            this.app.stage,
            this.textures,
            this.player,
            this.scoreManager // ScoreManagerを渡すことで、EntityManagerがスコア処理を委譲される
        );
        this.entityManager.setup(this.textures);
    }
    
    /** エンティティ間のイベント購読設定を担当 */
    private _subscribeEvents() {
        // 必要なエンティティが初期化済みであることを前提とする
        if (!this.player || !this.entityManager) throw new Error("Entities must be initialized before event subscription.");

        // Playerの発射イベントをEntityManagerに委譲
        this.player.on(
            Player.SHOOT_EVENT,
            this.entityManager.handlePlayerShoot,
            this.entityManager
        );
        // EntityManager内部でENEMY_DESTROYED_EVENTが処理されるため、Gameクラスでの購読は不要
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