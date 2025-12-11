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
        const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
        this.textures = atlas.textures;
        this.createScene();
    }

    private createScene() {
        this.player = new Player(this.textures[CONFIG.ASSETS.TEXTURES.PLAYER]);
        this.app.stage.addChild(this.player.sprite);

        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot, this);

        this.player.reset();

        this.entityManager = new EntityManager(
            this.app.stage,
            this.textures,
            this.player
        );

        this.entityManager.on(
            EntityManager.ENEMY_DESTROYED_EVENT,
            this.handleEnemyDestroyed,
            this
        );

        this.scoreManager.on(
            ScoreManager.SCORE_CHANGED_EVENT,
            // 💡 削除: スコア変更時のログ出力を削除
            () => {},
            this
        );

        this.app.ticker.add((ticker) => this.update(ticker));
    }

    private handlePlayerShoot(
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string,
        scaleOpt: ScaleOption | null,
        speedOpt: SpeedOption | null
    ) {
        const entityManager = this.entityManager;
        if (!entityManager) return;

        entityManager.spawn(
            ENTITY_KEYS.BULLET, 
            x, y, 
            velX, velY, 
            textureKey, 
            scaleOpt,   
            speedOpt
        );
    }
    
    private handleEnemyDestroyed() {
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    private update(ticker: Ticker) {
        if (!this.player || !this.entityManager) return;
        const delta = ticker.deltaMS / 1000;

        this.player.handleInput(this.input, delta);
        this.player.update(delta);

        this.entityManager.update(delta);
    }

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