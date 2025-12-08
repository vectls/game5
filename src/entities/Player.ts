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
    // 💡 【新規追加】扇形ショットの波状タイマー (KeyBで使用)
    private _fanShotWavyTimer: number = 0;
    // 💡 【新規追加】成長ショットの発射タイマー (KeyZで使用)
    private lastGrowingShotTime = 0;

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

        // 💡 【新規追加】扇形ショットの波状タイマーを更新
        this._fanShotWavyTimer = (this._fanShotWavyTimer + delta * 1000) % CONFIG.PLAYER.FAN_SHOT.WAVY_ARC.PERIOD_MS;
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
                this.fireFanShot(CONFIG.BULLET.SPEED);
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

        // 💡 【追記】成長ショット ('KeyQ')
        if (input.isDown('KeyQ')) { 
            const growingInterval = CONFIG.PLAYER.GROWING_SHOT.SHOT_INTERVAL_MS;
            if (now - this.lastGrowingShotTime > growingInterval) { 
                this.fireGrowingShot();
                this.lastGrowingShotTime = now;
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
 /**
     * キーBで発動する扇形ショット
     * @param speed 弾速
     */
    private fireFanShot(speed: number) {
        const { COUNT, WAVY_ARC } = CONFIG.PLAYER.FAN_SHOT;

        // 💡 【修正】波状変動する扇形角度 (Arc) を計算
        // サイン波を使用して、0 から 1 の範囲で変動する値 (0.0 〜 1.0)
        const timeRatio = this._fanShotWavyTimer / WAVY_ARC.PERIOD_MS;
        const sinValue = (Math.sin(timeRatio * 2 * Math.PI) + 1) / 2; // -1 to 1 を 0 to 1 に変換

        // 最終的な扇形角度を計算
        const arcDegrees = WAVY_ARC.BASE_ARC + WAVY_ARC.AMPLITUDE * sinValue;

        // 弾丸間の角度差 (扇形の角度 / (弾数 - 1))
        const angleStepDeg = COUNT > 1 ? arcDegrees / (COUNT - 1) : 0;
        
        // 扇形の中心からのオフセット角度
        const offsetDeg = arcDegrees / 2;

        // 垂直上向きを基準 (270度) とし、そこから左右に角度を振る
        const baseAngle = 270;

        for (let i = 0; i < COUNT; i++) {
            // 270度から左右に COUNT-1 のステップで分散させる
            const currentAngleDeg = baseAngle + (i * angleStepDeg) - offsetDeg; 
            
            // ラジアンに変換
            const angleRad = currentAngleDeg * (Math.PI / 180);
            
            const velX = speed * Math.cos(angleRad);
            const velY = speed * Math.sin(angleRad); 

            this.emit(
                Player.SHOOT_EVENT, 
                this.sprite.x,
                this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y, // 弾発射位置を調整
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

    /**
     * キーQで発動する成長ショット
     */
    private fireGrowingShot() {
        const speed = CONFIG.BULLET.SPEED;
        
        // 真上 (角度 270度 または -90度)
        const velX = 0; 
        const velY = -speed; // Y軸は下が正なので、上向きは負

        this.emit(
            Player.SHOOT_EVENT, 
            this.sprite.x,
            this.sprite.y - CONFIG.PLAYER.BULLET_OFFSET_Y, // 弾発射位置を調整
            velX, 
            velY,
            // 💡 【重要】成長ショットのパラメータを渡す (Bullet.tsで受け取る)
            CONFIG.PLAYER.GROWING_SHOT.GROWTH_RATE,
            CONFIG.PLAYER.GROWING_SHOT.MAX_SCALE
        );
    }
}
