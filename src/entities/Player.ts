// src/entities/Player.ts

import { Texture, EventEmitter } from "pixi.js";
import { GameObject } from "./GameObject";
import type { Collider } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";
// 💡 修正: 使用されていない型は 'import type' に変更し、未使用警告を解消
import type { ShotSpec } from "../types/ShotTypes"; 
import { TrajectoryModes, ShotPatterns } from "../types/ShotTypes";

export class Player extends GameObject implements Collider {

    public static readonly SHOOT_EVENT = "shoot";

    private lastShotTime = 0;
    public active: boolean = true;
    private emitter: EventEmitter = new EventEmitter();

    private _shotWavyTimer: number = 0; 
    private _rotaryShotAngle: number = 0; 

    constructor(texture: Texture) { 
        const w = texture.width;
        const h = texture.height;
        super(texture, w, h); 
        
        this.active = true;
    }
    
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
        this._shotWavyTimer = 0;
        this._rotaryShotAngle = 0;
        this.sprite.x = CONFIG.SCREEN.WIDTH * CONFIG.PLAYER.INITIAL_X_RATIO;
        this.sprite.y = CONFIG.PLAYER.INITIAL_Y;
    }

    public update(delta: number) {
        this._shotWavyTimer += delta; 
    }

    public takeHit() {
        if (!this.active) return;
    }
    
    public fire(spec: ShotSpec) {
        const { 
            pattern, 
            count, 
            speed, 
            trajectory, 
            angle, 
            spacing, 
            speedMod, 
            scale, 
            textureKey: specTextureKey,
            onDeathShot, // 💡 修正: onDeathShotを取得
        } = spec; 
        
        const textureKey = specTextureKey ?? CONFIG.ASSETS.TEXTURES.BULLET;
        const scaleOpt = scale ?? null;
        const speedOpt = speedMod ?? null; 
        const offsetY = spec.offsetY ?? CONFIG.PLAYER.BULLET_OFFSET_Y;

        let baseAngle = 270; // 真上 (度数)

        // --- 2. 方向の動かし方 (Trajectory) の計算 ---
        let trajectoryOffsetDeg = 0;
        
        if (trajectory) {
            switch (trajectory.mode) {
                case TrajectoryModes.ROTARY:
                    // 発射角度を更新し、今回の発射角度として使用
                    this._rotaryShotAngle = (this._rotaryShotAngle + trajectory.rate) % 360;
                    baseAngle = this._rotaryShotAngle;
                    break;
                    
                case TrajectoryModes.WAVE:
                    // サイン波で角度を揺らす
                    const range = trajectory.range ?? 30; 
                    const rate = trajectory.rate; 
                    trajectoryOffsetDeg = Math.sin(this._shotWavyTimer * rate) * range;
                    break;
                
                case TrajectoryModes.FIXED:
                default:
                    break;
            }
        }


        // --- 1. 発射時の配置 (Pattern) の計算 ---
        let startAngle = baseAngle + trajectoryOffsetDeg;
        let angleStep = 0;
        
        switch (pattern) {
            case ShotPatterns.FAN:
                const arc = angle || 60;
                startAngle -= (arc / 2); 
                angleStep = count > 1 ? arc / (count - 1) : 0;
                break;
                
            case ShotPatterns.RING:
                angleStep = 360 / count;
                break;
                
            case ShotPatterns.LINE:
            default:
                angleStep = 0;
                break;
        }


        // --- 弾丸生成ループ ---
        for (let i = 0; i < count; i++) {
            let currentAngleDeg = startAngle + (i * angleStep);
            
            const angleRad = currentAngleDeg * (Math.PI / 180);

            const velX = speed * Math.cos(angleRad);
            const velY = speed * Math.sin(angleRad);
            
            const finalX = (pattern === ShotPatterns.LINE && spacing)
                ? this.sprite.x + (i - (count - 1) / 2) * spacing
                : this.sprite.x;

            this.emit(
                Player.SHOOT_EVENT,
                finalX,
                this.sprite.y - offsetY,
                velX,
                velY,
                textureKey, 
                scaleOpt,   
                speedOpt,
                onDeathShot ?? null // 💡 修正: onDeathShotを渡す
            );
        }
    }

    public handleInput(input: InputManager, delta: number): void {
        const moveSpeed = CONFIG.PLAYER.SPEED * delta;

        // --- 移動ロジック ---
        if (input.isDown(CONFIG.INPUT.MOVE_LEFT)) {
            this.sprite.x = Math.max(
                this.sprite.x - moveSpeed,
                this.hitWidth / 2
            );
        }
        if (input.isDown(CONFIG.INPUT.MOVE_RIGHT)) {
            this.sprite.x = Math.min(
                this.sprite.x + moveSpeed,
                CONFIG.SCREEN.WIDTH - this.hitWidth / 2
            );
        }

        const now = performance.now();

        // --- 新しいショット定義 ---

        // KeyA: 基本の直線ショット (LINE + FIXED)
        if (input.isDown("KeyA")) {
            if (now - this.lastShotTime > 150) {
                this.fire({ pattern: "LINE", count: 1, speed: 600 });
                this.lastShotTime = now;
            }
        }

        // KeyS: 扇形ショット (FAN + FIXED)
        if (input.isDown("KeyS")) {
            if (now - this.lastShotTime > 250) {
                this.fire({ pattern: "FAN", count: 7, speed: 550, angle: 90 });
                this.lastShotTime = now;
            }
        }

        // KeyD: ロータリーショット (LINE + ROTARY)
        if (input.isDown("KeyD")) {
            if (now - this.lastShotTime > 20) {
                this.fire({
                    pattern: "LINE",
                    count: 1,
                    speed: 400,
                    trajectory: { mode: TrajectoryModes.ROTARY, rate: 15 }
                });
                this.lastShotTime = now;
            }
        }

        // KeyF: 角度が左右に揺れる直線ショット (LINE + WAVE)
        if (input.isDown("KeyF")) {
            if (now - this.lastShotTime > 100) {
                this.fire({
                    pattern: "LINE",
                    count: 4,
                    spacing: 30,
                    speed: 600,
                    trajectory: { mode: TrajectoryModes.WAVE, rate: 5, range: 30 },
                    scale: { rate: -0.5, initial: 1.2 },
                });
                this.lastShotTime = now;
            }
        }

        // KeyG: 加速・縮小するショット
        if (input.isDown("KeyG")) {
            if (now - this.lastShotTime > 150) {
                this.fire({
                    pattern: "LINE",
                    count: 1,
                    speed: 150, 
                    textureKey: CONFIG.ASSETS.TEXTURES.ENEMY_BULLET, 
                    speedMod: {
                        rate: 400, 
                    },
                    scale: {
                        rate: -0.8, 
                        initial: 2.0, 
                        minScale: 0.1,
                    },
                });
                this.lastShotTime = now;
            }
        }

        // KeyW: 鼓動する全方位ショット (RING + WAVE + SINE Scale)
        if (input.isDown("KeyW")) {
            if (now - this.lastShotTime > 1000) {
                this.fire({
                    pattern: "RING",
                    count: 16,
                    speed: 150,
                    trajectory: { mode: TrajectoryModes.WAVE, rate: 3, range: 10 },
                    scale: {
                        mode: "SINE",
                        rate: 4.0,
                        minScale: 0.8,
                        maxScale: 1.8,
                    },
                });
                this.lastShotTime = now;
            }
        }
        
        // KeyQ: 複合ショット & 死亡時子弾のテスト (LINE + ON DEATH)
        if (input.isDown("KeyQ")) {
            if (now - this.lastShotTime > 500) {
                this.fire({
                    pattern: "LINE",
                    count: 1,
                    speed: 400,
                    scale: { rate: 0.5, initial: 1.0, maxScale: 3.0 },
                    // 💡 新規: 弾が消えるときに全方位に子弾を8発発射
                    onDeathShot: {
                        pattern: "RING",
                        count: 8,
                        speed: 200,
                        textureKey: CONFIG.ASSETS.TEXTURES.ENEMY_BULLET,
                        scale: { rate: -1.0, initial: 1.0 },
                    }
                });
                this.lastShotTime = now;
            }
        }
    }
}