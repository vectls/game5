// src/core/EntityManager.ts
import { Container, Texture, EventEmitter } from "pixi.js";
import { CONFIG } from "../config";
import { ObjectPool } from "./ObjectPool";
import type { Poolable } from "./ObjectPool";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { EnemyBullet } from "../entities/EnemyBullet"; 
import { GameObject } from "../entities/GameObject";
import { checkAABBCollision } from "../utils/CollisionUtils";
import { Player } from "../entities/Player"; 
import type { ScaleOption, SpeedOption } from "../types/ShotTypes";

type ManagedObject = GameObject & Poolable;

export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
    ENEMY_BULLET: "enemy_bullet",
} as const; 

export type EntityType = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];

interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet;
    [ENTITY_KEYS.ENEMY]: Enemy;
    [ENTITY_KEYS.EXPLOSION]: Explosion;
    [ENTITY_KEYS.ENEMY_BULLET]: EnemyBullet;
}

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
    }
    
    private initializePools() {
        // Player Bullet
        this.initEntity(
            ENTITY_KEYS.BULLET,
            (texture) => new Bullet(texture), 
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        
        // Enemy
        this.initEntity(
            ENTITY_KEYS.ENEMY,
            (texture, manager) => new Enemy(texture, manager), 
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );

        // Enemy Bullet
        this.initEntity(
            ENTITY_KEYS.ENEMY_BULLET,
            (texture) => new EnemyBullet(texture), 
            CONFIG.ASSETS.TEXTURES.ENEMY_BULLET,
            CONFIG.ENEMY_BULLET.POOL_SIZE
        );
        
        // Explosion
        this.initEntity(
            ENTITY_KEYS.EXPLOSION,
            (texture) => new Explosion(texture), 
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

    private initEntity<T extends EntityType>(
        key: T,
        factory: (texture: Texture, manager?: EntityManager) => EntityMap[T], 
        textureKey: string,
        size: number
    ) {
        const poolFactory = () => {
            const managerArg = key === ENTITY_KEYS.ENEMY ? this : undefined;
            const obj = factory(this.textures[textureKey], managerArg as EntityManager);
            this.stage.addChild(obj.sprite);
            return obj;
        };

        const pool = new ObjectPool<EntityMap[T]>(poolFactory, size);

        this._pools[key] = pool as ObjectPool<any>; 
        this._activeObjects[key] = []; 
    }

    // 💡 削除: private getEntity は未使用のため削除

    private spawnEnemy() {
        const x = Math.random() * CONFIG.SCREEN.WIDTH;
        const y = -CONFIG.SCREEN.MARGIN;
        this.spawn(ENTITY_KEYS.ENEMY, x, y);
    }

    // --- spawnメソッドのオーバーロード ---

    public spawn(
        type: typeof ENTITY_KEYS.ENEMY | typeof ENTITY_KEYS.EXPLOSION, 
        x: number, 
        y: number
    ): Enemy | Explosion | undefined;

    public spawn(
        type: typeof ENTITY_KEYS.ENEMY_BULLET, 
        x: number, 
        y: number,
        velX: number,
        velY: number,
    ): EnemyBullet | undefined;

    public spawn(
        type: typeof ENTITY_KEYS.BULLET,
        x: number,
        y: number,
        velX: number,
        velY: number,
        textureKey: string, 
        scaleOpt?: ScaleOption | null,
        speedOpt?: SpeedOption | null
    ): Bullet | undefined;

    // 実装シグネチャ
    public spawn(
        type: EntityType, 
        x: number, 
        y: number, 
        velX?: number, 
        velY?: number,
        textureKey?: string, 
        scaleOpt: ScaleOption | null = null, 
        speedOpt: SpeedOption | null = null 
    ): ManagedObject | undefined {
        const pool = this._pools[type] as ObjectPool<ManagedObject>;
        if (!pool) return undefined;

        const activeList = this._activeObjects[type] as ManagedObject[];
        
        switch (type) {
            case ENTITY_KEYS.BULLET:
                if (velX === undefined || velY === undefined || !textureKey) {
                    return undefined;
                }
                
                const bullet = pool.get(x, y, velX, velY, scaleOpt, speedOpt) as Bullet;
                
                const texture = this.textures[textureKey];
                if (texture) {
                    bullet.setTexture(texture); 
                } else {
                     // 💡 削除: 警告ログを削除
                }
                
                activeList.push(bullet);
                return bullet;

            case ENTITY_KEYS.ENEMY:
                const enemy = pool.get(x, y) as Enemy;
                activeList.push(enemy);
                return enemy;
            
            case ENTITY_KEYS.EXPLOSION:
                const explosion = pool.get(x, y) as Explosion;
                activeList.push(explosion);
                return explosion;

            case ENTITY_KEYS.ENEMY_BULLET:
                if (velX === undefined || velY === undefined) {
                    return undefined;
                }
                const enemyBullet = pool.get(x, y, velX, velY) as EnemyBullet;
                activeList.push(enemyBullet);
                return enemyBullet;
        }
        return undefined; 
    }

    public update(delta: number) {
        const deltaMS = delta * 1000;

        // Enemy Spawner
        this.timeSinceLastSpawn += deltaMS;
        if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
            this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
        }

        // Update all active entities
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

        // 1. Player Bullet vs. Enemy
        if (activeBullets && activeEnemies) {
            for (const b of activeBullets) {
                if (!b.active) continue;

                for (const e of activeEnemies) {
                    if (!e.active) continue;

                    if (checkAABBCollision(b, e)) {
                        b.active = false;
                        e.active = false;

                        this.spawn(ENTITY_KEYS.EXPLOSION, e.x, e.y);
                        this.emit(
                            EntityManager.ENEMY_DESTROYED_EVENT,
                            CONFIG.ENEMY.SCORE_VALUE
                        );
                    }
                }
            }
        }

        // 2. Enemy Bullet vs. Player
        if (this.player.active && activeEnemyBullets) {
            for (const eb of activeEnemyBullets) {
                if (!eb.active) continue;

                if (checkAABBCollision(eb, this.player)) { 
                    eb.active = false; 
                    this.player.takeHit(); 
                    this.spawn(ENTITY_KEYS.EXPLOSION, this.player.x, this.player.y);
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