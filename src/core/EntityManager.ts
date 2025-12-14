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
// 🚀 修正 1: TrajectoryOption の型をインポートに追加
import {
    type ScaleOption,
    type SpeedOption,
    type ShotSpec,
    type TrajectoryOption,
} from "../types/ShotTypes";

type ManagedObject = GameObject & Poolable;

export const ENTITY_KEYS = {
    BULLET: "bullet",
    ENEMY: "enemy",
    EXPLOSION: "explosion",
    ENEMY_BULLET: "enemy_bullet",
} as const;

export type EntityType = (typeof ENTITY_KEYS)[keyof typeof ENTITY_KEYS];

interface EntityMap {
    [ENTITY_KEYS.BULLET]: Bullet;
    [ENTITY_KEYS.ENEMY]: Enemy;
    [ENTITY_KEYS.EXPLOSION]: Explosion;
    [ENTITY_KEYS.ENEMY_BULLET]: EnemyBullet;
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
    private _textures: Record<string, Texture>; // テクスチャ参照を保持
    private player: Player;

    private timeSinceLastEnemySpawn: number = 0;

    public static readonly ENEMY_DESTROYED_EVENT = "enemyDestroyed";

    // コンストラクタで textures を受け取ったらプロパティに保存するように変更
    constructor(
        container: Container,
        textures: Record<string, Texture>,
        player: Player
    ) {
        super();
        this._container = container;
        this._textures = textures; // 保持する
        this.player = player;

        this._pools = {} as { [key in EntityType]: ObjectPool<EntityMap[key]> };
    }

    public setup(textures: Record<string, Texture>): void {
        this._textures = textures; // 再度設定（念のため）

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
            const pool = this._pools[poolKey];
            pool.getAllObjects().forEach((obj: ManagedObject) => {
                this._container.addChild(obj.sprite);
            });
        }

        const enemyPool = this._pools[ENTITY_KEYS.ENEMY] as ObjectPool<Enemy>;
        enemyPool.getAllObjects().forEach((enemy: Enemy) => {
            // Enemyにon/emitが実装されている前提
            if (typeof enemy.on === "function") {
                enemy.on(Enemy.FIRE_EVENT, this.spawnEnemyBullet, this);
            }
        });
    }

    // 🚀 新規: Bulletがテクスチャを変更できるようにする
    public getTexture(key: string): Texture | undefined {
        return this._textures[key];
    }

    // main.ts から呼ばれる汎用スポーンメソッド
    // ResetArgs<EntityMap[K]> は Bullet の reset(x, y, velX, velY, textureKey, scaleOpt, speedOpt, trajectoryOpt, initialAngleDeg, onDeathShotSpec) に対応
    public spawn<K extends EntityType>(
        key: K,
        ...args: ResetArgs<EntityMap[K]>
    ): EntityMap[K] {
        const pool = this._pools[key] as ObjectPool<EntityMap[K]>;
        const obj = pool.get(...args);
        this._activeObjects[key].push(obj as ManagedObject);
        return obj;
    }

    public spawnEnemyBullet(x: number, y: number): EnemyBullet {
        // 💡 修正案: 速度を計算し、resetに渡す
        const targetX = this.player.x;
        const targetY = this.player.y;

        // プレイヤーに向かうベクトルを計算
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 敵弾の速度 (CONFIGから取得するか、仮の値を使用)
        // CONFIG.ENEMY_BULLET.SPEED が存在しない場合を想定して、仮に200とします
        const ENEMY_BULLET_SPEED = 200;

        const velX = (dx / distance) * ENEMY_BULLET_SPEED;
        const velY = (dy / distance) * ENEMY_BULLET_SPEED;

        // 修正された reset の引数に合わせて velX, velY を追加
        const enemyBullet = this.spawn(
            ENTITY_KEYS.ENEMY_BULLET,
            x,
            y,
            velX,
            velY
        );
        return enemyBullet;
    }

    // 古いメソッド（念のため残すが、main.tsはspawnを使っているはず）
    public spawnBullet(
        x: number,
        y: number,
        velX: number,
        velY: number,
        // 🚀 修正 3: ここも引数を追加（使われない可能性が高いが安全のため）
        textureKey: string = CONFIG.ASSETS.TEXTURES.BULLET,
        scaleOpt: ScaleOption | null = null,
        speedOpt: SpeedOption | null = null,
        trajectoryOpt: TrajectoryOption | null = null,
        initialAngleDeg: number = 0,
        onDeathShotSpec: ShotSpec | null = null
    ): Bullet | null {
        return this.spawn(
            ENTITY_KEYS.BULLET,
            x,
            y,
            velX,
            velY,
            textureKey,
            scaleOpt,
            speedOpt,
            trajectoryOpt, // 【新規】
            initialAngleDeg, // 【新規】
            onDeathShotSpec
        );
    }

    // 🚀 修正 4: fireDeathShot は Player.SHOOT_EVENT の全引数を揃えて emit する
    // Death Shotは、メイン弾丸が持っていた「trajectory, scale, speed, textureKey」の情報を使わないため、
    // ここでデフォルト値を設定して Player の fire メソッドのロジックを再利用する。
    public fireDeathShot(x: number, y: number, spec: ShotSpec): void {
        // PlayerのfireメソッドはShotSpecを分解して emit に流すため、ここでは簡易的なemitを行う
        // Playerのfire()のロジックを再利用するために、Player.SHOOT_EVENT に渡す引数を揃える必要がある。
        // spec の中には、発射に必要な情報 (pattern, count, speed, angle, baseAngleDegなど) が含まれている。
        // しかし、EntityManagerはPlayerのfireロジックを再実装するべきではない。
        // Player.ts 側の実装を信じ、specを引数として渡すのが最もシンプルで安全な方法。
        // ただし、Player.tsで修正した emit の引数リストは spec ではなく、分解されたプリミティブな値である。

        // 🚨 Player.ts の fire メソッドで、Player.SHOOT_EVENT に渡す引数リストに spec を分解して渡していたため、
        // ここでも同様に、spec に含まれる情報を使って、emit が期待する引数リストを揃える必要がある。

        // 暫定的な対応として、このメソッド自体が不要になるように、Bullet側を修正します。
        // Bullet.ts の deactivateAndFireDeathShot() は、このメソッドではなく、
        // プレイヤー側と同じロジックを使って、Player.SHOOT_EVENT を発火させるべき。

        // 既存の Player.SHOOT_EVENT は spec を受け取らないため、ここでは処理を変更しないままにします。
        // 後の Bullet.ts の修正で、このメソッドの扱いの見直しを提案します。

        // 💡 Bullet.ts の修正前にこのコードが実行されるとエラーになるため、Player.SHOOT_EVENT の引数を揃える。
        // spec から速度を抽出し、角度は一旦 270 (上) とし、それ以外のオプションは null で渡します。
        const velY = -(spec.speed ?? 0); // 速度が指定されていればそれを使う

        this.emit(
            Player.SHOOT_EVENT,
            x,
            y,
            0, // velX
            velY,
            spec.textureKey ?? CONFIG.ASSETS.TEXTURES.BULLET, // textureKey
            spec.scale ?? null, // scaleOpt
            spec.speedMod ?? null, // speedOpt
            null, // trajectoryOpt (DeathShotはFIXED想定)
            270, // initialAngleDeg (DeathShotはPlayerが計算)
            null // onDeathShotSpec
        );
    }

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

        if (activeBullets && activeEnemies) {
            for (const b of activeBullets) {
                if (!b.active) continue;
                for (const e of activeEnemies) {
                    if (!e.active) continue;
                    if (checkAABBCollision(b, e)) {
                        b.deactivateAndFireDeathShot();
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
}
