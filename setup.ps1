# create_project.ps1
# TypeScript/Pixi.js プロジェクトのファイル構成を一括作成するPowerShellスクリプト

# エラー時にスクリプトを停止
$ErrorActionPreference = "Stop"

# -----------------
# 1. フォルダの作成
# -----------------
Write-Host "✅ ディレクトリ構造を作成中..."
New-Item -ItemType Directory -Force -Path "src/core" | Out-Null
New-Item -ItemType Directory -Force -Path "src/entities" | Out-Null
Write-Host "   -> src/, src/core/, src/entities/ を作成しました。"

# -----------------
# 2. ファイルの作成と内容の書き込み
# -----------------

# --- src/config.ts ---
$config_content = @"
// src/config.ts
export const CONFIG = {
  SCREEN: {
    WIDTH: 800,
    HEIGHT: 600,
    BG_COLOR: 0x000000,
    MARGIN: 50, // 画面外判定のマージン（スポーン/デスポーン用）
  },
  ASSETS: {
    SHEET: "sprites/sheet.json",
    TEXTURES: {
      PLAYER: "playerShip1_blue.png",
      BULLET: "laserBlue07.png",
      ENEMY: "enemyBlack5.png",
    },
  },
  PLAYER: {
    SPEED: 300,
    SHOT_INTERVAL_MS: 150,
    INITIAL_X_RATIO: 0.5, // 画面幅に対する比率 (0.5 = 中央)
    INITIAL_Y: 500,       // 初期Y座標
    BULLET_OFFSET_Y: 20,  // 機体から弾が出る位置のオフセット
  },
  BULLET: {
    SPEED: 600,
    POOL_SIZE: 30, // 同時に出せる弾の上限数
  },
  ENEMY: {
    SPEED: 120,
    SPAWN_INTERVAL_MS: 2000,
    POOL_SIZE: 10, // 同時に出せる敵の上限数
  },
} as const;
"@
Set-Content -Path "src/config.ts" -Value $config_content
Write-Host "📄 src/config.ts を作成しました"

# --- src/core/InputManager.ts ---
$input_manager_content = @"
// src/core/InputManager.ts
export class InputManager {
  private keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
  }

  public isDown(code: string): boolean {
    return !!this.keys[code];
  }
}
"@
Set-Content -Path "src/core/InputManager.ts" -Value $input_manager_content
Write-Host "📄 src/core/InputManager.ts を作成しました"

# --- src/core/ObjectPool.ts ---
$object_pool_content = @"
// src/core/ObjectPool.ts
import { Container } from "pixi.js";

// プールで管理するオブジェクトが満たすべき条件
export interface Poolable {
  active: boolean;
  sprite: Container;
  reset(...args: any[]): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;

  constructor(factory: () => T, initialSize: number = 10) {
    this.factory = factory;
    for (let i = 0; i < initialSize; i++) {
      const obj = this.createObject();
      this.pool.push(obj);
    }
  }

  private createObject(): T {
    const obj = this.factory();
    obj.active = false;
    obj.sprite.visible = false;
    return obj;
  }

  // プールからオブジェクトを取得（なければ生成）
  public get(...args: any[]): T {
    let obj = this.pool.find((p) => !p.active);
    if (!obj) {
      obj = this.createObject();
      this.pool.push(obj);
    }
    
    obj.active = true;
    obj.sprite.visible = true;
    obj.reset(...args);
    return obj;
  }

  // オブジェクトを返却（非アクティブ化）
  public release(obj: T) {
    obj.active = false;
    obj.sprite.visible = false;
  }
}
"@
Set-Content -Path "src/core/ObjectPool.ts" -Value $object_pool_content
Write-Host "📄 src/core/ObjectPool.ts を作成しました"

# --- src/entities/GameObject.ts ---
$game_object_content = @"
// src/entities/GameObject.ts
import { Sprite, Texture, Rectangle } from "pixi.js";
import { Poolable } from "../core/ObjectPool";

export abstract class GameObject implements Poolable {
  public sprite: Sprite;
  public active: boolean = false;

  constructor(texture: Texture) {
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
  }

  abstract update(delta: number): void;
  abstract reset(...args: any[]): void;

  // 衝突判定
  public collidesWith(other: GameObject): boolean {
    if (!this.active || !other.active) return false;
    
    const a = this.sprite.getBounds();
    const b = other.sprite.getBounds();
    
    return (
      a.x + a.width > b.x &&
      a.x < b.x + b.width &&
      a.y + a.height > b.y &&
      a.y < b.y + b.height
    );
  }
}
"@
Set-Content -Path "src/entities/GameObject.ts" -Value $game_object_content
Write-Host "📄 src/entities/GameObject.ts を作成しました"

# --- src/entities/Bullet.ts ---
$bullet_content = @"
// src/entities/Bullet.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Bullet extends GameObject {
  constructor(texture: Texture) {
    super(texture);
  }

  reset(x: number, y: number) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  update(delta: number) {
    if (!this.active) return;
    
    this.sprite.y -= CONFIG.BULLET.SPEED * delta;
    
    // 画面上部のマージンを超えたら非アクティブ化
    if (this.sprite.y < -CONFIG.SCREEN.MARGIN) {
      this.active = false;
    }
  }
}
"@
Set-Content -Path "src/entities/Bullet.ts" -Value $bullet_content
Write-Host "📄 src/entities/Bullet.ts を作成しました"

# --- src/entities/Enemy.ts ---
$enemy_content = @"
// src/entities/Enemy.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Enemy extends GameObject {
  constructor(texture: Texture) {
    super(texture);
  }

  reset() {
    this.sprite.x = Math.random() * CONFIG.SCREEN.WIDTH;
    // 画面上部のマージン位置から出現
    this.sprite.y = -CONFIG.SCREEN.MARGIN;
  }

  update(delta: number) {
    if (!this.active) return;

    this.sprite.y += CONFIG.ENEMY.SPEED * delta;

    // 画面下部のマージンを超えたら非アクティブ化
    if (this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN) {
      this.active = false;
    }
  }
}
"@
Set-Content -Path "src/entities/Enemy.ts" -Value $enemy_content
Write-Host "📄 src/entities/Enemy.ts を作成しました"

# --- src/entities/Player.ts ---
$player_content = @"
// src/entities/Player.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";

export class Player extends GameObject {
  private lastShotTime = 0;
  private onShoot: (x: number, y: number) => void;

  constructor(texture: Texture, onShoot: (x: number, y: number) => void) {
    super(texture);
    this.onShoot = onShoot;
    this.active = true;
    this.sprite.visible = true;
    
    // 初期位置の設定
    this.sprite.x = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
    this.sprite.y = CONFIG.PLAYER.INITIAL_Y;
  }

  reset() {}

  update(delta: number) {
    // PlayerはhandleInputで操作
  }

  handleInput(input: InputManager, delta: number) {
    // 移動
    if (input.isDown("ArrowLeft") && this.sprite.x > 0) {
      this.sprite.x -= CONFIG.PLAYER.SPEED * delta;
    }
    if (input.isDown("ArrowRight") && this.sprite.x < CONFIG.SCREEN.WIDTH) {
      this.sprite.x += CONFIG.PLAYER.SPEED * delta;
    }

    // 発射
    const now = performance.now();
    if (input.isDown("Space") && now - this.lastShotTime > CONFIG.PLAYER.SHOT_INTERVAL_MS) {
      // 発射位置オフセットを適用
      this.onShoot(this.sprite.x, this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y);
      this.lastShotTime = now;
    }
  }
}
"@
Set-Content -Path "src/entities/Player.ts" -Value $player_content
Write-Host "📄 src/entities/Player.ts を作成しました"

# --- src/main.ts ---
$main_content = @"
// src/main.ts
import { Application, Assets, Texture, Ticker } from "pixi.js";
import { CONFIG } from "./config";
import { InputManager } from "./core/InputManager";
import { ObjectPool } from "./core/ObjectPool";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Enemy } from "./entities/Enemy";

class Game {
  private app: Application;
  private input: InputManager;
  private textures: Record<string, Texture> = {};

  private player: Player | null = null;
  
  private bulletPool: ObjectPool<Bullet> | null = null;
  private enemyPool: ObjectPool<Enemy> | null = null;

  // 現在画面上に存在して更新が必要なリスト
  private activeBullets: Bullet[] = [];
  private activeEnemies: Enemy[] = [];

  private timeSinceLastSpawn = 0;

  constructor(app: Application) {
    this.app = app;
    this.input = new InputManager();
  }

  async init() {
    const atlas = await Assets.load(CONFIG.ASSETS.SHEET);
    this.textures = atlas.textures;
    this.createScene();
  }

  private createScene() {
    // 1. プールの初期化
    this.bulletPool = new ObjectPool<Bullet>(
        () => {
            const b = new Bullet(this.textures[CONFIG.ASSETS.TEXTURES.BULLET]);
            this.app.stage.addChild(b.sprite);
            return b;
        }, 
        CONFIG.BULLET.POOL_SIZE
    );

    this.enemyPool = new ObjectPool<Enemy>(
        () => {
            const e = new Enemy(this.textures[CONFIG.ASSETS.TEXTURES.ENEMY]);
            this.app.stage.addChild(e.sprite);
            return e;
        }, 
        CONFIG.ENEMY.POOL_SIZE
    );

    // 2. プレイヤー生成
    this.player = new Player(
      this.textures[CONFIG.ASSETS.TEXTURES.PLAYER],
      (x, y) => this.spawnBullet(x, y)
    );
    this.app.stage.addChild(this.player.sprite);

    // 3. ループ開始
    this.app.ticker.add((ticker) => this.update(ticker));
  }

  private spawnBullet(x: number, y: number) {
    if (!this.bulletPool) return;
    const bullet = this.bulletPool.get(x, y);
    this.activeBullets.push(bullet);
  }

  private spawnEnemy() {
    if (!this.enemyPool) return;
    const enemy = this.enemyPool.get();
    this.activeEnemies.push(enemy);
  }

  private update(ticker: Ticker) {
    if (!this.player) return;
    # deltaMSはPixiの仕様で、秒換算で利用するために1000で割る
    const delta = ticker.deltaMS / 1000;

    # 1. プレイヤー更新
    this.player.handleInput(this.input, delta);

    # 2. 敵スポーン
    this.timeSinceLastSpawn += ticker.elapsedMS;
    if (this.timeSinceLastSpawn >= CONFIG.ENEMY.SPAWN_INTERVAL_MS) {
      this.spawnEnemy();
      this.timeSinceLastSpawn = 0;
    }

    # 3. オブジェクト更新
    this.activeBullets.forEach(b => b.update(delta));
    this.activeEnemies.forEach(e => e.update(delta));

    # 4. 当たり判定
    this.handleCollisions();

    # 5. クリーンアップ
    this.cleanup();
  }

  private handleCollisions() {
    for (const b of this.activeBullets) {
      if (!b.active) continue;

      for (const e of this.activeEnemies) {
        if (!e.active) continue;

        if (b.collidesWith(e)) {
          b.active = false;
          e.active = false;
        }
      }
    }
  }

  private cleanup() {
    if (this.bulletPool) {
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const b = this.activeBullets[i];
            if (!b.active) {
                this.bulletPool.release(b);
                this.activeBullets.splice(i, 1);
            }
        }
    }

    if (this.enemyPool) {
        for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
            const e = this.activeEnemies[i];
            if (!e.active) {
                this.enemyPool.release(e);
                this.activeEnemies.splice(i, 1);
            }
        }
    }
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
"@
Set-Content -Path "src/main.ts" -Value $main_content
Write-Host "📄 src/main.ts を作成しました"

Write-Host "`n🎉 プロジェクトファイルの作成が完了しました！"