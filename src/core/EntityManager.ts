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
import type { ScaleOption, SpeedOption } from "../types/ShotTypes";

// 🚀 【import type に修正】型エイリアス
type ManagedObject = GameObject & Poolable;

export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
    ENEMY_BULLET: "enemy_bullet",
} as const; 

export type EntityType = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];

// 🚀 【import type に修正】インターフェース
interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet;
    [ENTITY_KEYS.ENEMY]: Enemy;
    [ENTITY_KEYS.EXPLOSION]: Explosion;
    [ENTITY_KEYS.ENEMY_BULLET]: EnemyBullet;
}

// 💡 削除: 未使用エラー (Code 6196) のため EntityFactory 型定義を削除

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
        this.timeSinceLastSpawn = CONFIG.ENEMY.SPAWN_INTERVAL_MS;
        
        // 💡 修正: プレイヤーのショットイベントを購読 (main.tsにリスナーがあるが、こちらにも必要)
        this.player.on(Player.SHOOT_EVENT, this.handlePlayerShoot, this);
    }
    
    // 💡 新規追加: プレイヤーのショットイベントを処理するハンドラ
    private handlePlayerShoot(
        x: number, 
        y: number, 
        velX: number, 
        velY: number, 
        textureKey: string, // Player.tsから渡される
        scaleOpt: ScaleOption | null, 
        speedOpt: SpeedOption | null
    ) {
        // Bulletのspawnを呼び出す
        this.spawn(
            ENTITY_KEYS.BULLET, 
            x, y, 
            velX, velY, 
            textureKey, // textureKeyを渡す
            scaleOpt, 
            speedOpt
        );
    }

    private initializePools() {
        // プレイヤー弾 (Bullet)
        this.initEntity(
            ENTITY_KEYS.BULLET,
            (texture) => new Bullet(texture), // 💡 修正: manager引数を削除
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        
        // 敵 (Enemy) - managerを渡す必要がある場合はfactoryを維持
        this.initEntity(
            ENTITY_KEYS.ENEMY,
            (texture, manager) => new Enemy(texture, manager), 
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );

        // 敵弾 (EnemyBullet)
        this.initEntity(
            ENTITY_KEYS.ENEMY_BULLET,
            (texture) => new EnemyBullet(texture), // 💡 修正: manager引数を削除
            CONFIG.ASSETS.TEXTURES.ENEMY_BULLET,
            CONFIG.ENEMY_BULLET.POOL_SIZE
        );
        
        // 爆発 (Explosion)
        this.initEntity(
            ENTITY_KEYS.EXPLOSION,
            (texture) => new Explosion(texture), // 💡 修正: manager引数を削除
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

    private initEntity<T extends EntityType>(
        key: T,
        // 💡 修正: managerが不要な場合は削除 (Code 6133 対策)
        factory: (texture: Texture, manager?: EntityManager) => EntityMap[T], 
        textureKey: string,
        size: number
    ) {
        // ObjectPoolに渡す引数なしのファクトリ関数を生成し、依存関係を注入する
        const poolFactory = () => {
            // Enemyの場合は this を渡し、それ以外は渡さない
            const managerArg = key === ENTITY_KEYS.ENEMY ? this : undefined;
            const obj = factory(this.textures[textureKey], managerArg as EntityManager);
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

    // 💡 削除: 旧式の spawnBullet は不要
    // public spawnBullet(...) {...}

    // 💡 修正: 速度を受け取らないオーバーロード
    public spawnEnemyBullet(x: number, y: number, velX: number, velY: number) {
        // EnemyBulletはreset(x, y, velX, velY)を受け取ると仮定
        this.getEntity(ENTITY_KEYS.ENEMY_BULLET, x, y, velX, velY);
    }
    
    private spawnEnemy() {
        const x = Math.random() * CONFIG.SCREEN.WIDTH;
        const y = -CONFIG.SCREEN.MARGIN;
        this.getEntity(ENTITY_KEYS.ENEMY, x, y);
    }

    public spawnExplosion(x: number, y: number) {
        this.getEntity(ENTITY_KEYS.EXPLOSION, x, y);
    }

    // --- spawnメソッドのオーバーロード ---

    // Enemy / Explosion (座標のみを受け取る)
    public spawn(
        type: typeof ENTITY_KEYS.ENEMY | typeof ENTITY_KEYS.EXPLOSION, 
        x: number, 
        y: number
    ): Enemy | Explosion | undefined;

    // EnemyBullet (座標と速度を受け取る)
    public spawn(
        type: typeof ENTITY_KEYS.ENEMY_BULLET, 
        x: number, 
        y: number,
        velX: number,
        velY: number,
    ): EnemyBullet | undefined;

    // 💡 Bullet (テクスチャキーとオプションを受け取る)
    public spawn(
        type: typeof ENTITY_KEYS.BULLET,
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string, // 💡 textureKeyを必須に
        scaleOpt?: ScaleOption | null,
        speedOpt?: SpeedOption | null
    ): Bullet | undefined;

    // 実装シグネチャ (全ての引数を網羅)
    public spawn(
        type: EntityType, 
        x: number, 
        y: number, 
        velX?: number, 
        velY?: number,
        textureKey?: string, // 💡 textureKeyを導入
        scaleOpt: ScaleOption | null = null, 
        speedOpt: SpeedOption | null = null 
    ): ManagedObject | undefined {
        const pool = this._pools[type] as ObjectPool<ManagedObject>;
        if (!pool) return undefined;

        const activeList = this._activeObjects[type] as ManagedObject[];
        
        switch (type) {
            case ENTITY_KEYS.BULLET:
                const bullet = pool.get() as Bullet;
                
                if (velX !== undefined && velY !== undefined && textureKey) {
                    const texture = this.textures[textureKey]; // 💡 テクスチャキーでアセットを取得
                    if (texture) {
                        // 💡 BulletのsetTextureを呼び出し、テクスチャとヒットボックスを更新
                        bullet.setTexture(texture); 
                    } else {
                         console.warn(`Texture key ${textureKey} not found for bullet. Using default pool texture.`);
                         // プールで初期化されたデフォルトのテクスチャが使用されます
                    }
                    
                    // 💡 resetにテクスチャキーを渡さない
                    bullet.reset(x, y, velX, velY, scaleOpt, speedOpt); 
                } else {
                    console.error("Bullet spawn called without required parameters for BULLET type.");
                    return undefined;
                }
                activeList.push(bullet);
                return bullet;

            case ENTITY_KEYS.ENEMY:
                const enemy = pool.get() as Enemy;
                enemy.reset(x, y); 
                activeList.push(enemy);
                return enemy;
            
            case ENTITY_KEYS.EXPLOSION:
                const explosion = pool.get() as Explosion;
                explosion.reset(x, y); 
                activeList.push(explosion);
                return explosion;

            case ENTITY_KEYS.ENEMY_BULLET:
                const enemyBullet = pool.get() as EnemyBullet;
                if (velX !== undefined && velY !== undefined) {
                    // EnemyBulletはreset(x, y, velX, velY)を受け取ることを想定
                    enemyBullet.reset(x, y, velX, velY); 
                } else {
                    // 速度引数が不足している場合は、リセットしないか、reset(x,y)のみ呼び出す (実装依存)
                    // 仮に reset(x, y) で初期化すると仮定
                    enemyBullet.reset(x, y, velX ?? 0, velY ?? 0); // ゼロ速度でリセット
                }
                activeList.push(enemyBullet);
                return enemyBullet;
        }
        return undefined; 
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