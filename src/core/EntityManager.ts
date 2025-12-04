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

// 🚀 【変更なし】定数としてエンティティキーを一元管理 (as constが重要)
export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
} as const; 

// 🚀 【変更なし】EntityTypeを定数オブジェクトから導出
export type EntityType = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];

// 🚀 【重要: 追加済み】EntityMapの定義: Record型と連携し、型安全性を高める
interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet;
    [ENTITY_KEYS.ENEMY]: Enemy;
    [ENTITY_KEYS.EXPLOSION]: Explosion;
}

type EntityConstructor<T extends ManagedObject> = new (texture: Texture) => T;
export class EntityManager extends EventEmitter {
    private stage: Container;
    private textures: Record<string, Texture>;

    // イベント名定数
    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    // 🚀 【ts(2564)エラー解消】Record型で定義し、初期化子 = {} を設定
    private _pools: Record<EntityType, ObjectPool<any>> = {} as Record<EntityType, ObjectPool<any>>;
    private _activeObjects: Record<EntityType, ManagedObject[]> = {} as Record<EntityType, ManagedObject[]>;

    private timeSinceLastSpawn = 0;

    constructor(stage: Container, textures: Record<string, Texture>) {
        super();

        this.stage = stage;
        this.textures = textures;
        this.initializePools();
    }

    private initializePools() {
        // 新しいエンティティを追加する場合、ここに追加するだけでOKです
        this.initEntity(
            ENTITY_KEYS.BULLET,
            Bullet as EntityConstructor<Bullet>, 
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        this.initEntity(
            ENTITY_KEYS.ENEMY,
            Enemy as EntityConstructor<Enemy>,
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );
        this.initEntity(
            ENTITY_KEYS.EXPLOSION,
            Explosion as EntityConstructor<Explosion>,
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

    // 🚀 ジェネリックなエンティティ初期化メソッド
    private initEntity<T extends ManagedObject>(
        key: EntityType,
        Type: EntityConstructor<T>,
        textureKey: string,
        size: number
    ) {
        const pool = new ObjectPool<T>(() => {
            const obj = new Type(this.textures[textureKey]);
            this.stage.addChild(obj.sprite);
            return obj;
        }, size);

        // 🚀 【修正1】Mapの.set()をRecordのプロパティ代入に変更
        this._pools[key] = pool as ObjectPool<any>; 
        this._activeObjects[key] = []; 
    }

    // 🚀 ジェネリックなエンティティ取得メソッド (型安全性の向上)
    private getEntity<K extends EntityType>(
        key: K,
        ...args: any[]
    ): EntityMap[K] {
        // 🚀 【修正2】Mapの.get()をRecordのプロパティアクセスに変更
        const pool = this._pools[key] as ObjectPool<EntityMap[K]>;
        const list = this._activeObjects[key] as EntityMap[K][];

        const obj = pool.get(...(args as any));
        list.push(obj);
        return obj;
    }

    // プレイヤーから弾生成の依頼を受ける (外部公開API)
    public spawnBullet(x: number, y: number) {
        // EntityMapのおかげで、戻り値がBullet型に安全に確定する
        this.getEntity(ENTITY_KEYS.BULLET, x, y);
    }

    // 敵生成 (内部ロジック)
    private spawnEnemy() {
        this.getEntity(ENTITY_KEYS.ENEMY);
    }

    // 爆発生成 (内部ロジック)
    private spawnExplosion(x: number, y: number) {
        this.getEntity(ENTITY_KEYS.EXPLOSION, x, y);
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

        // 🚀 【修正3】Mapの.values()をObject.values()に変更
        for (const list of Object.values(this._activeObjects)) {
            list.forEach((obj) => obj.update(delta));
        }

        this.handleCollisions();
        this.cleanup();
    }

    // 🚀 衝突判定の分離 (可読性向上)
    private handleCollisions() {
        // 🚀 【修正4】Mapの.get()をRecordのプロパティアクセスに変更
        const activeBullets = this._activeObjects[ENTITY_KEYS.BULLET] as Bullet[];
        const activeEnemies = this._activeObjects[ENTITY_KEYS.ENEMY] as Enemy[];

        // ヌルチェックは必要に応じて追加できますが、ここでは初期化済みと仮定します
        if (!activeBullets || !activeEnemies) return;

        for (const b of activeBullets) {
            if (!b.active) continue;

            for (const e of activeEnemies) {
                if (!e.active) continue;

                if (checkAABBCollision(b, e)) {
                    b.active = false;
                    e.active = false;

                    this.spawnExplosion(e.x, e.y); // 爆発生成
                    this.emit(
                        EntityManager.ENEMY_DESTROYED_EVENT,
                        CONFIG.ENEMY.SCORE_VALUE
                    );
                }
            }
        }
    }

    private cleanup() {
        // 🚀 【修正5】Mapの.entries()をObject.entries()に変更
        // Object.entries()でキーと値のペアをループ。型アサーションで型を保証
        for (const [key, list] of Object.entries(this._activeObjects) as [EntityType, ManagedObject[]][]) {
            // 🚀 【修正6】Mapの.get()をRecordのプロパティアクセスに変更
            const pool = this._pools[key] as ObjectPool<ManagedObject>;
            this.cleanupList(list, pool);
        }
    }

    // リストのクリーンアップヘルパーメソッドをManagedObjectで統一
    private cleanupList(
        list: ManagedObject[],
        pool: ObjectPool<ManagedObject>
    ) {
        // 配列操作のため後ろからループ
        for (let i = list.length - 1; i >= 0; i--) {
            const obj = list[i];
            if (!obj.active) {
                pool.release(obj); // プールに戻す
                list.splice(i, 1); // アクティブリストから削除
            }
        }
    }
}