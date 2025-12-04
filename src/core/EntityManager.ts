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

// 🚀 【新規追加】定数としてエンティティキーを一元管理 (as constが重要)
export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
} as const; // これにより、値が文字列リテラル型として固定される

// 🚀 【変更点】EntityTypeを定数オブジェクトから導出
// typeof ENTITY_KEYS: オブジェクトの型 { BULLET: "bullet", ENEMY: "enemy", ... }
// [keyof typeof ENTITY_KEYS]: オブジェクトのキー("BULLET" | "ENEMY" | ...)
// の値を取り出すため、型は "bullet" | "enemy" | "explosion" のユニオン型になる
export type EntityType = typeof ENTITY_KEYS[keyof typeof ENTITY_KEYS];

type EntityConstructor<T extends ManagedObject> = new (texture: Texture) => T;
export class EntityManager extends EventEmitter {
    private stage: Container;
    private textures: Record<string, Texture>;

    // イベント名定数
    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    // 個別のプールとリストを廃止し、Mapに統合
    private _pools = new Map<EntityType, ObjectPool<any>>();
    private _activeObjects = new Map<EntityType, ManagedObject[]>();

    private timeSinceLastSpawn = 0;

    constructor(stage: Container, textures: Record<string, Texture>) {
        super();

        this.stage = stage;
        this.textures = textures;

        // 🚀 初期化処理は一箇所に集中させ、統一的なメソッドで処理します
        this.initializePools();
    }

    private initializePools() {
        // 新しいエンティティを追加する場合、ここに追加するだけでOKです
        this.initEntity(
            ENTITY_KEYS.BULLET,
            Bullet as EntityConstructor<Bullet>, // 型キャストでコンストラクタの型を明確にする
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
        key: EntityType, // 厳密な EntityType をキーとして使用
        Type: EntityConstructor<T>,
        textureKey: string,
        size: number
    ) {
        const pool = new ObjectPool<T>(() => {
            const obj = new Type(this.textures[textureKey]);
            this.stage.addChild(obj.sprite);
            return obj;
        }, size);

        // Mapに格納 (キーはEntityType、値はObjectPool<T>だが、Mapの定義に合わせてanyを許容)
        this._pools.set(key, pool as ObjectPool<any>);
        this._activeObjects.set(key, []);
    }

    // 🚀 ジェネリックなエンティティ取得メソッド (内部処理を統一)
    private getEntity<T extends ManagedObject>(
        key: EntityType,
        ...args: any[]
    ): T {
        // ObjectPool<T> の型安全な取得のためにキャスト
        const pool = this._pools.get(key) as ObjectPool<T> | undefined;
        const list = this._activeObjects.get(key) as T[] | undefined;

        if (!pool || !list) {
            // ここに到達した場合、initializePools()での定義漏れを意味します
            throw new Error(`Entity type ${key} not registered.`);
        }

        // ObjectPool.getはResetArgs<T>の型安全な引数を期待
        const obj = pool.get(...(args as any));
        list.push(obj);
        return obj;
    }

    // プレイヤーから弾生成の依頼を受ける (外部公開API)
    public spawnBullet(x: number, y: number) {
        this.getEntity<Bullet>(ENTITY_KEYS.BULLET, x, y);
    }

    // 敵生成 (内部ロジック)
    private spawnEnemy() {
        this.getEntity<Enemy>(ENTITY_KEYS.ENEMY);
    }

    // 爆発生成 (内部ロジック)
    private spawnExplosion(x: number, y: number) {
        this.getEntity<Explosion>(ENTITY_KEYS.EXPLOSION, x, y);
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

        // 🚀 全オブジェクト更新 (新しいエンティティが増えてもこのループは変更不要)
        for (const list of this._activeObjects.values()) {
            list.forEach((obj) => obj.update(delta));
        }

        this.handleCollisions();
        this.cleanup();
    }

    // 🚀 衝突判定の分離 (可読性向上)
    private handleCollisions() {
        // 衝突判定を行うエンティティのリストをMapから取得
        const activeBullets = this._activeObjects.get(ENTITY_KEYS.BULLET) as Bullet[];
        const activeEnemies = this._activeObjects.get(ENTITY_KEYS.ENEMY) as Enemy[];

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
        // 🚀 全オブジェクトのクリーンアップ (新しいエンティティが増えてもこのループは変更不要)
        for (const [key, list] of this._activeObjects.entries()) {
            const pool = this._pools.get(key) as ObjectPool<ManagedObject>;
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
