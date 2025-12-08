// src/core/EntityManager.ts
import { Container, Texture, EventEmitter } from "pixi.js";
import { CONFIG } from "../config";
import { ObjectPool } from "./ObjectPool";
// 🚀 【import type に修正】型のみを参照
import type { Poolable } from "./ObjectPool";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { EnemyBullet } from "../entities/EnemyBullet"; 
import { GameObject } from "../entities/GameObject";
import { checkAABBCollision } from "../utils/CollisionUtils";
import { Player } from "../entities/Player"; 

// 🚀 【import type に修正】型エイリアス
type ManagedObject = GameObject & Poolable;

export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
    ENEMY_BULLET: "enemy_bullet", // 👈 追加
} as const; 

export type EntityType = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];

// 🚀 【import type に修正】インターフェース
interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet;
    [ENTITY_KEYS.ENEMY]: Enemy;
    [ENTITY_KEYS.EXPLOSION]: Explosion;
    [ENTITY_KEYS.ENEMY_BULLET]: EnemyBullet;
}

// 🚀 【import type に修正】型エイリアス
type EntityFactory<T extends ManagedObject> = (texture: Texture, manager: EntityManager) => T;

export class EntityManager extends EventEmitter {
    private stage: Container;
    private textures: Record<string, Texture>;
    private player: Player; 

    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    private _pools: Record<EntityType, ObjectPool<any>> = {} as Record<EntityType, ObjectPool<any>>;
    private _activeObjects: Record<EntityType, ManagedObject[]> = {} as Record<EntityType, ManagedObject[]>;

    private timeSinceLastSpawn = 0;

    constructor(stage: Container, textures: Record<string, Texture>, player: Player) {
        super();

        this.stage = stage;
        this.textures = textures;
        this.player = player; 
        this.initializePools();
        this.timeSinceLastSpawn = CONFIG.ENEMY.SPAWN_INTERVAL_MS; // 初期スポーンまでの待機時間を設定
    }

    private initializePools() {
        // プレイヤー弾 (Bullet)
        this.initEntity(
            ENTITY_KEYS.BULLET,
            (texture, manager) => new Bullet(texture), 
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        
        // 敵 (Enemy) - EntityManager自身を依存性として注入
        this.initEntity(
            ENTITY_KEYS.ENEMY,
            (texture, manager) => new Enemy(texture, manager), 
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );

        // 敵弾 (EnemyBullet) - 新規追加
        this.initEntity(
            ENTITY_KEYS.ENEMY_BULLET,
            (texture, manager) => new EnemyBullet(texture),
            CONFIG.ASSETS.TEXTURES.ENEMY_BULLET,
            CONFIG.ENEMY_BULLET.POOL_SIZE
        );
        
        // 爆発 (Explosion)
        this.initEntity(
            ENTITY_KEYS.EXPLOSION,
            (texture, manager) => new Explosion(texture),
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

    private initEntity<T extends EntityType>(
        key: T,
        factory: (texture: Texture, manager: EntityManager) => EntityMap[T], 
        textureKey: string,
        size: number
    ) {
        // ObjectPoolに渡す引数なしのファクトリ関数を生成し、依存関係を注入する
        const poolFactory = () => {
            const obj = factory(this.textures[textureKey], this);
            this.stage.addChild(obj.sprite);
            return obj;
        };

        const pool = new ObjectPool<EntityMap[T]>(poolFactory, size);

        this._pools[key] = pool as ObjectPool<any>; 
        this._activeObjects[key] = []; 
    }

    private getEntity<K extends EntityType>(
        key: K,
        ...args: any[]
    ): EntityMap[K] {
        const pool = this._pools[key] as ObjectPool<EntityMap[K]>;
        const list = this._activeObjects[key] as EntityMap[K][];

        const obj = pool.get(...(args as any));
        list.push(obj);
        return obj;
    }

    // 🚀 修正: 速度(X, Y)を受け取るように変更
    // 🚀 【修正】成長パラメータ (growthRate, maxScale) を追加
    public spawnBullet(x: number, y: number, velX: number, velY: number, growthRate: number = 0, maxScale: number = 1.0) {
        // 修正: 速度引数に加えて、成長引数もgetEntity経由でBulletのresetに渡す
        this.getEntity(ENTITY_KEYS.BULLET, x, y, velX, velY, growthRate, maxScale); 
    }

    public spawnEnemyBullet(x: number, y: number) {
        this.getEntity(ENTITY_KEYS.ENEMY_BULLET, x, y);
    }


    
    private spawnEnemy() {
        const x = Math.random() * CONFIG.SCREEN.WIDTH;
        const y = -CONFIG.SCREEN.MARGIN;
        this.getEntity(ENTITY_KEYS.ENEMY, x, y);
    }

    public spawnExplosion(x: number, y: number) {
        this.getEntity(ENTITY_KEYS.EXPLOSION, x, y);
    }

    /**
     * 🚀 【修正: 汎用スポーン】
     * 汎用的なエンティティスポーンメソッド
     * @param key スポーンするエンティティの種類 (ENTITY_KEYS)
     * @param args エンティティの reset メソッドに渡す引数
     */
    public spawn<K extends EntityType>(
        key: K,
        ...args: any[]
    ): EntityMap[K] {
        return this.getEntity(key, ...args);
    }

    public update(delta: number) {
        const deltaMS = delta * 1000;

        // 敵スポーンロジック
        this.timeSinceLastSpawn += deltaMS;
        if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
            this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
        }

        for (const list of Object.values(this._activeObjects)) {
            list.forEach((obj) => obj.update(delta));
        }

        this.handleCollisions();
        this.cleanup();
    }

    private handleCollisions() {
        const activeBullets = this._activeObjects[ENTITY_KEYS.BULLET] as Bullet[];
        const activeEnemies = this._activeObjects[ENTITY_KEYS.ENEMY] as Enemy[];
        const activeEnemyBullets = this._activeObjects[ENTITY_KEYS.ENEMY_BULLET] as EnemyBullet[]; 

        // 1. プレイヤーの弾 vs. 敵 (既存ロジック)
        if (activeBullets && activeEnemies) {
            for (const b of activeBullets) {
                if (!b.active) continue;

                for (const e of activeEnemies) {
                    if (!e.active) continue;

                    if (checkAABBCollision(b, e)) {
                        b.active = false;
                        e.active = false;

                        this.spawnExplosion(e.x, e.y); 
                        this.emit(
                            EntityManager.ENEMY_DESTROYED_EVENT,
                            CONFIG.ENEMY.SCORE_VALUE
                        );
                    }
                }
            }
        }

        // 2. 敵の弾 vs. プレイヤー (新規ロジック)
        if (this.player.active && activeEnemyBullets) {
            for (const eb of activeEnemyBullets) {
                if (!eb.active) continue;

                if (checkAABBCollision(eb, this.player)) { 
                    eb.active = false; 
                    this.player.takeHit(); 
                    this.spawnExplosion(this.player.x, this.player.y);
                    return; 
                }
            }
        }
    }

    private cleanup() {
        for (const [key, list] of Object.entries(this._activeObjects) as [EntityType, ManagedObject[]][]) {
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
}