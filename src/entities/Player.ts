// src/entities/Player.ts
import { Texture, EventEmitter } from "pixi.js";
import { GameObject } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";

export class Player extends GameObject {

    public static readonly SHOOT_EVENT = "shoot";

    private lastShotTime = 0;
    public active: boolean = true;
    private emitter: EventEmitter = new EventEmitter();

    // 🚀 新規追加: ロータリーショットの現在の回転角度 (度)
    private _rotaryShotAngle: number = 0;

    // 🚀 波状回転用の角度 (KeyCで使用)
    private _wavyRotaryShotAngle: number = 0;
    // 🚀 波状回転の位相タイマー
    private _wavyRotationTimer: number = 0;   
    private lastWavyShotTime = 0; // KeyC用の発射タイマー

    constructor(texture: Texture) { 
        super(texture, texture.width, texture.height);
        this.active = true;
    }

    // 💡 EventEmitterの機能を外部に公開するためのメソッド（main.tsがこれを使って購読します）
    public on(event: string | symbol, fn: (...args: any[]) => void, context?: any): this {
        this.emitter.on(event, fn, context);
        return this;
    }

    public emit(event: string | symbol, ...args: any[]): boolean {
        return this.emitter.emit(event, ...args);
    }

    public reset() {
        this.active = true;
        this.sprite.visible = true;
        this.lastShotTime = 0;
        
        // 初期位置の設定
        this.sprite.x = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
        this.sprite.y = CONFIG.PLAYER.INITIAL_Y;
    }

    // 🚀 修正: update メソッドで2種類の角度を独立して更新
    update(delta: number) {
        
        // 1. STANDARD ROTARY SHOT ROTATION (一定回転)
        const standardRotationSpeed = CONFIG.PLAYER.ROTARY_SHOT.ROTATION_SPEED;
        // 常に一定速度で回転します
        this._rotaryShotAngle = (this._rotaryShotAngle + standardRotationSpeed * delta) % 360;

        // 2. WAVY ROTARY SHOT ROTATION (滑らかな波状回転)
        const wavySpeed = CONFIG.PLAYER.WAVY_ROTARY_SHOT.ROTATION_SPEED;
        const halfPeriodMs = CONFIG.PLAYER.WAVY_ROTARY_SHOT.ROTATION_CHANGE_INTERVAL_MS;
        const fullPeriodMs = halfPeriodMs * 2;
        
        // 位相タイマーを更新
        this._wavyRotationTimer += delta * 1000;
        if (this._wavyRotationTimer >= fullPeriodMs) {
            this._wavyRotationTimer -= fullPeriodMs;
        }

        // サインカーブで滑らかな回転速度を計算 (-最大速度から+最大速度まで変動)
        const phase = (this._wavyRotationTimer / fullPeriodMs) * 2 * Math.PI;
        const modulationFactor = Math.sin(phase);
        const currentWavyRotationSpeed = wavySpeed * modulationFactor;

        // 波状回転用の角度を更新
        this._wavyRotaryShotAngle = (this._wavyRotaryShotAngle + currentWavyRotationSpeed * delta) % 360;
    }

    // 🚀 【追加】ダメージを受けるメソッド
    public takeHit() {
        if (!this.active) return;

        // ここにHP減少や無敵時間、ゲームオーバー判定のロジックを実装します
        console.log("Player hit!");
        // 例: this.hp -= 1;
        // if (this.hp <= 0) this.die();
    }

    handleInput(input: InputManager, delta: number) {
        const halfWidth = this.hitWidth / 2;

        // 移動
        if (input.isDown(CONFIG.INPUT.MOVE_LEFT)) {
            this.sprite.x -= CONFIG.PLAYER.SPEED * delta;
        }
        if (input.isDown(CONFIG.INPUT.MOVE_RIGHT)) {
            this.sprite.x += CONFIG.PLAYER.SPEED * delta;
        }

        // 画面境界でのクランプ（はみ出し防止）
        this.sprite.x = Math.max(
            halfWidth,
            Math.min(CONFIG.SCREEN.WIDTH - halfWidth, this.sprite.x)
        );

        const now = performance.now();
        const interval = CONFIG.PLAYER.SHOT_INTERVAL_MS;

        // 1. 単発ショット (CONFIG.INPUT.SHOOT)
        if (input.isDown(CONFIG.INPUT.SHOOT)) {
            if (now - this.lastShotTime > interval) {
                this.fireSingleShot(); // 単発ショットを実行
                this.lastShotTime = now;
            }
        }
        
        // 2. 扇形ショット (仮のキー 'KeyZ' を使用)
        if (input.isDown('KeyZ')) { 
            // 扇形ショットは少し発射間隔を長く設定
            if (now - this.lastShotTime > interval * 1.5) { 
                this.fireFanShot(); // 🚀 扇形ショットを実行
                this.lastShotTime = now;
            }
        }

        // 2. 🚀 標準ロータリーショット ('KeyX')：一定回転
        else if (input.isDown('KeyX')) { 
            const rotaryInterval = CONFIG.PLAYER.ROTARY_SHOT.SHOT_INTERVAL_MS;
            if (now - this.lastShotTime > rotaryInterval) { 
                // fireRotaryShot()を汎用化し、標準角度と弾数を渡す
                this.fireRotaryShot(this._rotaryShotAngle, CONFIG.PLAYER.ROTARY_SHOT.COUNT); 
                this.lastShotTime = now;
            }
        }

        // 3. 🚀 波状ロータリーショット ('KeyC')：波状回転
        else if (input.isDown('KeyC')) { 
            const wavyInterval = CONFIG.PLAYER.WAVY_ROTARY_SHOT.SHOT_INTERVAL_MS;
            if (now - this.lastWavyShotTime > wavyInterval) { 
                // fireRotaryShot()を汎用化し、波状角度と弾数を渡す
                this.fireRotaryShot(this._wavyRotaryShotAngle, CONFIG.PLAYER.WAVY_ROTARY_SHOT.COUNT);
                this.lastWavyShotTime = now;
            }
        }
    }

    // 単発ショットのロジック (前回追加)
    private fireSingleShot() {
        const speed = CONFIG.BULLET.SPEED;
        const velX = 0;
        const velY = -speed; // y軸は下向きが正なので、上向きは負

        this.emit(
            Player.SHOOT_EVENT, 
            this.sprite.x,
            this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y,
            velX,
            velY
        );
    }

    // 🚀 新規/修正メソッド: 扇形に弾丸を発射するロジック
    private fireFanShot() {
        // 設定値の取得
        const numBullets = CONFIG.PLAYER.FAN_SHOT.COUNT;
        const arc = CONFIG.PLAYER.FAN_SHOT.ARC_DEGREES;
        const speed = CONFIG.BULLET.SPEED;
        
        // 角度の計算 (プレイヤーは上向き=90度を基準とする)
        const startAngleRad = (90 - arc / 2) * (Math.PI / 180);
        const angleStepRad = (arc / (numBullets - 1)) * (Math.PI / 180);

        for (let i = 0; i < numBullets; i++) {
            let angleRad = startAngleRad;
            if (numBullets > 1) {
                angleRad += i * angleStepRad;
            }

            // 速度ベクトルの計算
            const velX = speed * Math.cos(angleRad);
            const velY = -speed * Math.sin(angleRad); // y軸は下向きが正

            this.emit(
                Player.SHOOT_EVENT, // イベント名
                this.sprite.x,
                this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y,
                velX,
                velY
            );
        }
    }

    // 🚀 修正: fireRotaryShot を汎用化し、基準角度と弾数を引数で受け取る
    private fireRotaryShot(baseAngleDeg: number, numBullets: number) {
        const speed = CONFIG.BULLET.SPEED;
        
        const angleStepDeg = 360 / numBullets;
        
        for (let i = 0; i < numBullets; i++) {
            // 基準角度 (標準 or 波状) を使って弾丸の角度を計算
            const currentAngleDeg = (baseAngleDeg + i * angleStepDeg) % 360;
            
            const angleRad = currentAngleDeg * (Math.PI / 180);
            
            const velX = speed * Math.cos(angleRad);
            const velY = speed * Math.sin(angleRad); 

            this.emit(
                Player.SHOOT_EVENT, 
                this.sprite.x,
                this.sprite.y, 
                velX, 
                velY  
            );
        }
    }

    // // 🚀 【再実装】 COUNT を使用した円形同時発射ロジック
    // private fireRotaryShot() {
    //     const numBullets = CONFIG.PLAYER.ROTARY_SHOT.COUNT;
    //     const speed = CONFIG.BULLET.SPEED;
        
    //     // 弾丸間の角度差 (360度 / 弾数)
    //     const angleStepDeg = 360 / numBullets;
        
    //     // 🚀 基準角度として、updateで更新された滑らかな角度を使用
    //     const baseAngleDeg = this._rotaryShotAngle;

    //     for (let i = 0; i < numBullets; i++) {
    //         // 現在の円形配置における角度 = 基準角度 + 均等分割された角度
    //         const currentAngleDeg = (baseAngleDeg + i * angleStepDeg) % 360;
            
    //         // ラジアンに変換
    //         const angleRad = currentAngleDeg * (Math.PI / 180);
            
    //         // 速度ベクトルの計算
    //         const velX = speed * Math.cos(angleRad);
    //         const velY = speed * Math.sin(angleRad); 

    //         this.emit(
    //             Player.SHOOT_EVENT, 
    //             this.sprite.x,
    //             this.sprite.y, 
    //             velX, 
    //             velY  
    //         );
    //     }
    // }
}
