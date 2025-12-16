// src/main.ts

import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";

// Core modules
import { InputManager } from "./core/InputManager";
import { ScoreManager } from "./core/ScoreManager";
import { EntityManager } from "./core/EntityManager";

// Entities
import { Player } from "./entities/Player";

// UI
import { ScoreDisplay } from "./ui/ScoreDisplay"; // 🚀 インポート追加

class Game {
    private app: Application;
    private input: InputManager;
    private textures: Record<string, Texture> = {};

    private player: Player | null = null;
    private scoreManager: ScoreManager;
    private entityManager: EntityManager | null = null;
    private scoreDisplay: ScoreDisplay; // 🚀 プロパティ追加

    constructor(app: Application) {
        this.app = app;
        this.input = new InputManager();
        this.scoreManager = new ScoreManager();
        this.scoreDisplay = new ScoreDisplay(); // 🚀 初期化追加
    }

    /** 初期化処理 */
    async init() {
        const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
        this.textures = atlas.textures as Record<string, Texture>;
        this.createScene();
    }

    /** ゲームシーンの構築 (全体の流れを定義) */
    private createScene() {
        this._createPlayer();
        this._createEntityManager();
        this._createUI(); // 🚀 UI作成メソッドを追加
        this._subscribeEvents();

        // メインループ開始
        this.app.ticker.add((ticker) => this.update(ticker));
    }

    /** プレイヤーの生成と初期化を担当 */
    private _createPlayer() {
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);
        
        // 🚀 修正点: 初期位置の計算をmain.ts側で行い、Player.tsからCONFIGへの依存を排除
        const initialX = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
        const initialY = CONFIG.PLAYER.INITIAL_Y;
        
        // 🚀 修正点: 計算した座標をPlayer.reset()に渡す
        this.player.reset(initialX, initialY);
    }
    
    /** エンティティマネージャーの生成と依存性注入を担当 */
    private _createEntityManager() {
        if (!this.player) throw new Error("Player must be initialized before EntityManager.");
        
        // EntityManagerにPlayerとScoreManagerを依存性注入
        this.entityManager = new EntityManager(
            this.app.stage,
            this.textures,
            this.player,
            this.scoreManager
        );
        this.entityManager.setup(this.textures);
    }
    
    /** 🚀 UIの生成と初期化を担当 */
    private _createUI() {
        // スコア表示をステージに追加
        this.app.stage.addChild(this.scoreDisplay.container);
        this.scoreDisplay.updateScore(this.scoreManager.score);
    }

    /** モジュール間のイベント購読設定を担当 (コーディネート) */
    private _subscribeEvents() {
        if (!this.player || !this.entityManager) throw new Error("Entities must be initialized before event subscription.");

        // Playerの発射イベントをEntityManagerに委譲 (既存)
        this.player.on(
            Player.SHOOT_EVENT,
            this.entityManager.handlePlayerShoot,
            this.entityManager
        );
        
        // 🚀 ScoreManagerのスコア変更イベントをScoreDisplayに委譲
        this.scoreManager.on(
            ScoreManager.SCORE_CHANGED_EVENT, 
            this.scoreDisplay.updateScore, 
            this.scoreDisplay 
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
        this.scoreDisplay.destroy(); // 🚀 ScoreDisplayの解放を追加
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