// src/core/EntityManager.ts

import { Container, Texture, EventEmitter } from "pixi.js";
import { CONFIG } from "../config";
import { ObjectPool, type Poolable, type ResetArgs } from "./ObjectPool";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { EnemyBullet } from "../entities/EnemyBullet";
import { GameObject } from "../entities/GameObject";
import { checkAABBCollision } from "../utils/CollisionUtils";
import { Player } from "../entities/Player";
import { ScoreManager } from "./ScoreManager";

// ENTITY_KEYSは値として使用するため、通常のimportにする
import { ENTITY_KEYS } from "../types/EntityKeys";
import type { ShotSpec, ScaleOption, SpeedOption, TrajectoryOption } from "../types/ShotTypes";
import { ShotPatterns } from "../types/ShotTypes"; 

// 🚀 修正: ENTITY_KEYSをこのモジュールから再エクスポート (Uncaught SyntaxError 対策)
export { ENTITY_KEYS }; 

type ManagedObject = GameObject & Poolable;

// 🚀 修正: プール/アクティブオブジェクト管理対象のキーを明示的に定義
export type PooledKey = 
    | typeof ENTITY_KEYS.BULLET 
    | typeof ENTITY_KEYS.ENEMY 
    | typeof ENTITY_KEYS.EXPLOSION 
    | typeof ENTITY_KEYS.ENEMY_BULLET;

export type EntityType = PooledKey; 

// 全てのエンティティがPoolableであることを保証する型マップを定義
interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet & Poolable;
    [ENTITY_KEYS.ENEMY]: Enemy & Poolable;
    [ENTITY_KEYS.EXPLOSION]: Explosion & Poolable;
    [ENTITY_KEYS.ENEMY_BULLET]: EnemyBullet & Poolable;
}

export class EntityManager extends EventEmitter {
    private _pools: { [key in EntityType]: ObjectPool<EntityMap[key]> };
    private _activeObjects: { [key in EntityType]: ManagedObject[] } = {
        [ENTITY_KEYS.BULLET]: [],
        [ENTITY_KEYS.ENEMY]: [],
        [ENTITY_KEYS.EXPLOSION]: [],
        [ENTITY_KEYS.ENEMY_BULLET]: [],
    };
    private _container: Container;
    private _textures: Record<string, Texture>;
    private player: Player;
    private scoreManager: ScoreManager;

    private timeSinceLastEnemySpawn: number = 0;

    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    constructor(
        container: Container,
        textures: Record<string, Texture>,
        player: Player,
        scoreManager: ScoreManager
    ) {
        super();
        this._container = container;
        this._textures = textures;
        this.player = player;
        this.scoreManager = scoreManager;

        this._pools = {} as { [key in EntityType]: ObjectPool<EntityMap[key]> };
    }

    public setup(textures: Record<string, Texture>): void {
        this._textures = textures;

        const bulletFactory = () =>
            new Bullet(textures[CONFIG.ASSETS.TEXTURES.BULLET], this);
        const enemyFactory = () =>
            new Enemy(textures[CONFIG.ASSETS.TEXTURES.ENEMY], this);
        const explosionFactory = () =>
            new Explosion(textures[CONFIG.ASSETS.TEXTURES.EXPLOSION]);
        const enemyBulletFactory = () =>
            new EnemyBullet(textures[CONFIG.ASSETS.TEXTURES.ENEMY_BULLET]);

        this._pools[ENTITY_KEYS.BULLET] = new ObjectPool(
            bulletFactory,
            CONFIG.BULLET.POOL_SIZE
        );
        this._pools[ENTITY_KEYS.ENEMY] = new ObjectPool(
            enemyFactory,
            CONFIG.ENEMY.POOL_SIZE
        );
        this._pools[ENTITY_KEYS.EXPLOSION] = new ObjectPool(
            explosionFactory,
            CONFIG.EXPLOSION.POOL_SIZE
        );
        this._pools[ENTITY_KEYS.ENEMY_BULLET] = new ObjectPool(
            enemyBulletFactory,
            CONFIG.ENEMY_BULLET.POOL_SIZE
        );

        for (const poolKey of Object.keys(this._pools) as EntityType[]) {
            const pool = this._pools[poolKey] as ObjectPool<ManagedObject>;
            pool.getAllObjects().forEach((obj: ManagedObject) => {
                this._container.addChild(obj.sprite);
            });
        }

        const enemyPool = this._pools[ENTITY_KEYS.ENEMY] as ObjectPool<Enemy>;
        enemyPool.getAllObjects().forEach((enemy: Enemy) => {
            if (typeof enemy.on === "function") {
                enemy.on(Enemy.FIRE_EVENT, this.spawnEnemyBullet, this);
            }
        });

        this.on(
            EntityManager.ENEMY_DESTROYED_EVENT,
            this.handleEnemyDestroyed,
            this
        );
    }

    public getTexture(key: string): Texture | undefined {
        return this._textures[key];
    }

    /** オブジェクトプールからエンティティを取得・初期化し、アクティブリストに追加する汎用メソッド */
    public spawn<K extends EntityType>(
        key: K,
        ...args: ResetArgs<EntityMap[K]>
    ): EntityMap[K] {
        const pool = this._pools[key] as ObjectPool<EntityMap[K]>;
        const obj = pool.get(...args);
        this._activeObjects[key].push(obj as ManagedObject); 
        return obj;
    }

    /** 敵の発射イベントを受信し、プレイヤーを追尾する敵弾を生成 */
    public spawnEnemyBullet(x: number, y: number): EnemyBullet {
        const targetX = this.player.x;
        const targetY = this.player.y;

        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const ENEMY_BULLET_SPEED = CONFIG.ENEMY_BULLET.SPEED ?? 200;

        const velX = (dx / distance) * ENEMY_BULLET_SPEED;
        const velY = (dy / distance) * ENEMY_BULLET_SPEED;

        const enemyBullet = this.spawn(
            ENTITY_KEYS.ENEMY_BULLET,
            x,
            y,
            velX,
            velY
        );
        return enemyBullet;
    }

    /** 敵スポナーのロジック */
    private addEnemySpawner(delta: number) {
        this.timeSinceLastEnemySpawn += delta * 1000;

        if (this.timeSinceLastEnemySpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
            this.timeSinceLastEnemySpawn = 0;
            const x = Math.random() * (CONFIG.SCREEN.WIDTH - 100) + 50;
            const y = CONFIG.ENEMY.INITIAL_Y;
            this.spawn(ENTITY_KEYS.ENEMY, x, y);
        }
    }

    public update(delta: number): void {
        this.addEnemySpawner(delta);
        
        for (const key of Object.keys(this._activeObjects) as EntityType[]) {
            const list = this._activeObjects[key];
            for (const obj of list) {
                if (obj.active) {
                    obj.update(delta);
                }
            }
        }

        this.collisionCheck();
        this.cleanup();
    }

    private collisionCheck(): void {
        const activeBullets = this._activeObjects[
            ENTITY_KEYS.BULLET
        ] as Bullet[];
        const activeEnemies = this._activeObjects[ENTITY_KEYS.ENEMY] as Enemy[];
        const activeEnemyBullets = this._activeObjects[
            ENTITY_KEYS.ENEMY_BULLET
        ] as EnemyBullet[];

        // プレイヤー弾 vs 敵
        if (activeBullets && activeEnemies) {
            for (const b of activeBullets) {
                if (!b.active) continue;
                for (const e of activeEnemies) {
                    if (!e.active) continue;
                    if (checkAABBCollision(b, e)) {
                        b.deactivateAndFireDeathShot();
                        e.active = false;
                        this.spawn(ENTITY_KEYS.EXPLOSION, e.x, e.y); 

                        this.emit(EntityManager.ENEMY_DESTROYED_EVENT);
                    }
                }
            }
        }

        // 敵弾 vs プレイヤー
        if (this.player.active && activeEnemyBullets) {
            for (const eb of activeEnemyBullets) {
                if (!eb.active) continue;
                if (checkAABBCollision(eb, this.player)) {
                    eb.active = false;
                    this.player.takeHit();
                    this.spawn(
                        ENTITY_KEYS.EXPLOSION,
                        this.player.x,
                        this.player.y
                    );
                    return;
                }
            }
        }
    }

    private cleanup() {
        for (const key of Object.keys(this._activeObjects) as EntityType[]) {
            const list = this._activeObjects[key];
            const pool = this._pools[key] as ObjectPool<ManagedObject>;
            this.cleanupList(list, pool);
        }
    }

    private cleanupList(
        list: ManagedObject[],
        pool: ObjectPool<ManagedObject>
    ) {
        for (let i = list.length - 1; i >= 0; i--) {
            const obj = list[i];
            if (!obj.active) {
                pool.release(obj);
                list.splice(i, 1);
            }
        }
    }

    /** Playerの発射イベントを受信し、Bulletを生成するロジック (main.tsから委譲) */
    public handlePlayerShoot(
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
        this.spawn(
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

    /** 敵撃破時のスコア加算ロジック (EntityManager内部で完結) */
    public handleEnemyDestroyed() {
        this.scoreManager.addScore(CONFIG.ENEMY.SCORE_VALUE);
    }

    /**
     * 弾が消える際に発射される「デスショット」を生成します。
     */
    public fireDeathShot(x: number, y: number, spec: ShotSpec): void {
        const {
            pattern,
            count,
            speed,
            trajectory,
            angle,
            spacing,
            speedMod,
            scale,
            textureKey: specTextureKey,
            onDeathShot, 
            baseAngleDeg: specBaseAngleDeg,
        } = spec;

        const textureKey = specTextureKey ?? CONFIG.ASSETS.TEXTURES.BULLET;
        const scaleOpt = scale ?? null;
        const speedOpt = speedMod ?? null;
        const trajectoryOpt = trajectory ?? null;

        let baseAngle = specBaseAngleDeg ?? 0;

        // --- 1. 発射時の配置 (Pattern) の計算 ---
        let startAngle = baseAngle;
        let angleStep = 0;

        switch (pattern) {
            case ShotPatterns.FAN:
                const fanAngle = angle ?? 360;
                angleStep = fanAngle / (count > 1 ? count - 1 : 1);
                startAngle = baseAngle - fanAngle / 2;
                break;
            case ShotPatterns.LINE:
            default:
                break;
        }

        // --- 2. 発射実行 (Bullet生成) ---
        for (let i = 0; i < count; i++) {
            let currentAngleDeg = startAngle + angleStep * i;

            let offsetX = 0;
            if (pattern === ShotPatterns.LINE && spacing && count > 1) {
                offsetX = spacing * (i - (count - 1) / 2);
                currentAngleDeg = baseAngle;
            }

            const angleRad = currentAngleDeg * (Math.PI / 180);
            const finalVelX = speed * Math.cos(angleRad);
            const finalVelY = speed * Math.sin(angleRad);

            const finalX = x + offsetX;
            const finalY = y;

            this.spawn(
                ENTITY_KEYS.BULLET,
                finalX,
                finalY,
                finalVelX,
                finalVelY,
                textureKey,
                scaleOpt,
                speedOpt,
                trajectoryOpt,
                currentAngleDeg,
                onDeathShot ?? null 
            );
        }
    }
}