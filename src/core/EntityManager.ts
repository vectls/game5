// src/core/EntityManager.ts
import { Container, Texture, Ticker } from "pixi.js";
import { CONFIG } from "../config";
import { ObjectPool } from "./ObjectPool";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { Explosion } from "../entities/Explosion";
import { GameObject } from "../entities/GameObject";

// 敵破壊時にGameクラスへ通知するためのコールバック型
type EnemyDestroyedCallback = () => void;

export class EntityManager {
    private stage: Container;
    private textures: Record<string, Texture>;
    private onEnemyDestroyed: EnemyDestroyedCallback;

    // プールとアクティブリストは内部で保持
    private bulletPool: ObjectPool<Bullet>;
    private enemyPool: ObjectPool<Enemy>;
    private explosionPool: ObjectPool<Explosion>;

    private activeBullets: Bullet[] = [];
    private activeEnemies: Enemy[] = [];
    private activeExplosions: Explosion[] = [];

    private timeSinceLastSpawn = 0;

    constructor(
        stage: Container,
        textures: Record<string, Texture>,
        onEnemyDestroyed: EnemyDestroyedCallback
    ) {
        this.stage = stage;
        this.textures = textures;
        this.onEnemyDestroyed = onEnemyDestroyed;

        // 全てのプールを初期化
        this.bulletPool = this.createPool(
            Bullet,
            CONFIG.ASSETS.TEXTURES.BULLET,
            CONFIG.BULLET.POOL_SIZE
        );
        this.enemyPool = this.createPool(
            Enemy,
            CONFIG.ASSETS.TEXTURES.ENEMY,
            CONFIG.ENEMY.POOL_SIZE
        );
        this.explosionPool = this.createPool(
            Explosion,
            CONFIG.ASSETS.TEXTURES.EXPLOSION,
            CONFIG.EXPLOSION.POOL_SIZE
        );
    }

    // ジェネリックなプール生成ヘルパーメソッド
    private createPool<T extends GameObject>(
        Type: new (texture: Texture) => T,
        textureKey: string,
        size: number
    ): ObjectPool<T> {
        return new ObjectPool<T>(() => {
            const obj = new Type(this.textures[textureKey]);
            this.stage.addChild(obj.sprite);
            return obj;
        }, size);
    }

    // プレイヤーから弾生成の依頼を受ける
    public spawnBullet(x: number, y: number) {
        const bullet = this.bulletPool.get(x, y);
        this.activeBullets.push(bullet);
    }

    private spawnEnemy() {
        const enemy = this.enemyPool.get();
        this.activeEnemies.push(enemy);
    }

    private spawnExplosion(x: number, y: number) {
        const explosion = this.explosionPool.get(x, y);
        this.activeExplosions.push(explosion);
    }

    // 毎フレームの全エンティティ処理を一括で行う
    public update(ticker: Ticker) {
        const delta = ticker.deltaMS / 1000;

        // 敵スポーンロジック
        this.timeSinceLastSpawn += ticker.elapsedMS;
        if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
            this.spawnEnemy();
            this.timeSinceLastSpawn = 0;
        }

        // オブジェクト更新
        this.activeBullets.forEach((b) => b.update(delta));
        this.activeEnemies.forEach((e) => e.update(delta));
        this.activeExplosions.forEach((ex) => ex.update(delta));

        this.handleCollisions();
        this.cleanup();
    }

    // src/core/EntityManager.ts の handleCollisions メソッド
    private handleCollisions() {
        for (const b of this.activeBullets) {
            if (!b.active) continue;

            for (const e of this.activeEnemies) {
                if (!e.active) continue;

                // 中心座標とヒットサイズを使用したAABB衝突判定
                const dx = Math.abs(b.x - e.x);
                const dy = Math.abs(b.y - e.y);

                const totalHalfWidth = b.hitWidth / 2 + e.hitWidth / 2;
                const totalHalfHeight = b.hitHeight / 2 + e.hitHeight / 2;

                const isCollision = dx < totalHalfWidth && dy < totalHalfHeight;

                if (isCollision) {
                    b.active = false;
                    e.active = false;

                    this.spawnExplosion(e.x, e.y); // 爆発生成
                    this.onEnemyDestroyed(); // スコア処理をGameクラスへ通知
                }
            }
        }
    }

    private cleanup() {
        this.cleanupList(this.activeBullets, this.bulletPool);
        this.cleanupList(this.activeEnemies, this.enemyPool);
        this.cleanupList(this.activeExplosions, this.explosionPool);
    }

    // リストのクリーンアップヘルパーメソッド
    private cleanupList<T extends GameObject>(list: T[], pool: ObjectPool<T>) {
        for (let i = list.length - 1; i >= 0; i--) {
            const obj = list[i];
            if (!obj.active) {
                pool.release(obj);
                list.splice(i, 1);
            }
        }
    }
}
