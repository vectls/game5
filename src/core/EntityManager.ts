// src/core/EntityManager.ts
import { Container, Texture, EventEmitter } from "pixi.js";
import { CONFIG } from "../config";
import { ObjectPool } from "./ObjectPool";
import type { Poolable } from "./ObjectPool";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { GameObject } from "../entities/GameObject";
import { checkAABBCollision } from "../utils/CollisionUtils";

// 管理対象オブジェクトの統一的な型を定義 (GameObjectかつPoolable)
type ManagedObject = GameObject & Poolable;

export class EntityManager extends EventEmitter{
    private stage: Container;
    private textures: Record<string, Texture>;

    // イベント名定数
    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    // 個別のプールとリストを廃止し、Mapに統合
    private _pools = new Map<string, ObjectPool<any>>();
    private _activeObjects = new Map<string, ManagedObject[]>();

    private timeSinceLastSpawn = 0;

    constructor(
        stage: Container,
        textures: Record<string, Texture>
    ) {
        super();

        this.stage = stage;
        this.textures = textures;

        // エンティティ初期化を統一されたメソッドで行う
        this.initEntity(
            "bullet", // キー
            Bullet,
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        this.initEntity(
            "enemy",
            Enemy,
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );
        this.initEntity(
            "explosion",
            Explosion,
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

   // 🚀 P4: ジェネリックなエンティティ初期化メソッド
    private initEntity<T extends ManagedObject>(
        key: string,
        Type: new (texture: Texture) => T,
        textureKey: string,
        size: number
    ) {
        const pool = new ObjectPool<T>(() => {
            const obj = new Type(this.textures[textureKey]);
            this.stage.addChild(obj.sprite);
            return obj;
        }, size);

        // 型安全を維持しつつMapに格納
        this._pools.set(key, pool as ObjectPool<any>); 
        this._activeObjects.set(key, []);
    }
    
    // 🚀 P4: ジェネリックなエンティティ取得メソッド
    private getEntity<T extends ManagedObject>(key: string, ...args: any[]): T {
        const pool = this._pools.get(key) as ObjectPool<T> | undefined;
        const list = this._activeObjects.get(key) as T[] | undefined;

        if (!pool || !list) {
            throw new Error(`Entity type ${key} not registered.`);
        }

        // ObjectPool.getはResetArgs<T>の型安全な引数を期待
        const obj = pool.get(...args as any); 
        list.push(obj);
        return obj;
    }

    // プレイヤーから弾生成の依頼を受ける
    public spawnBullet(x: number, y: number) {
        this.getEntity<Bullet>("bullet", x, y);
    }

    private spawnEnemy() {
        this.getEntity<Enemy>("enemy");
    }

    private spawnExplosion(x: number, y: number) {
        this.getEntity<Explosion>("explosion", x, y);
    }

    // updateの引数からelapsedMSを削除し、delta(秒)のみを使用
    public update(delta: number) {
        const deltaMS = delta * 1000;

        // 敵スポーンロジック
        this.timeSinceLastSpawn += deltaMS;
        if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
            this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
        }

        // オブジェクト更新をMapの値でループ
        for (const list of this._activeObjects.values()) {
            list.forEach((obj) => obj.update(delta));
        }

        this.handleCollisions();
        this.cleanup();
    }

    private handleCollisions() {
        // 🚀 P4: Mapからリストを取得
        const activeBullets = this._activeObjects.get("bullet") as Bullet[];
        const activeEnemies = this._activeObjects.get("enemy") as Enemy[];

        for (const b of activeBullets) {
            if (!b.active) continue;

            for (const e of activeEnemies) {
                if (!e.active) continue;

                if (checkAABBCollision(b, e)) { //
                    b.active = false;
                    e.active = false;

                    this.spawnExplosion(e.x, e.y); // 爆発生成
                    this.emit(
                        EntityManager.ENEMY_DESTROYED_EVENT, //
                        CONFIG.ENEMY.SCORE_VALUE //
                    );
                }
            }
        }
    }

    private cleanup() {
        // 🚀 P4: Mapのエントリをループして一括クリーンアップ
        for (const [key, list] of this._activeObjects.entries()) {
            const pool = this._pools.get(key) as ObjectPool<ManagedObject>;
            this.cleanupList(list, pool);
        }
    }

// 🚀 P4: リストのクリーンアップヘルパーメソッドをManagedObjectで統一
    private cleanupList(list: ManagedObject[], pool: ObjectPool<ManagedObject>) {
        for (let i = list.length - 1; i >= 0; i--) {
            const obj = list[i];
            if (!obj.active) {
                pool.release(obj);
                list.splice(i, 1);
            }
        }
    }
}
