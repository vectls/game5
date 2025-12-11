// src/entities/Player.ts

import { Texture, EventEmitter } from "pixi.js";
import { GameObject } from "./GameObject";
import type { Collider } from "./GameObject";
import { InputManager } from "../core/InputManager";
import { CONFIG } from "../config";
import type { ShotSpec, ScaleOption, SpeedOption } from "../types/ShotTypes"; 

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
        console.log("Player hit!");
        // TODO: ここにHP減少や無敵時間、ゲームオーバー判定のロジックを実装します
    }
    
    public fire(spec: ShotSpec) {
        const { pattern, count, speed, scale, wave, speedMod, textureKey: specTextureKey } = spec; 
        
        const textureKey = specTextureKey ?? CONFIG.ASSETS.TEXTURES.BULLET;
        const scaleOpt = scale ?? null;
        const speedOpt = speedMod ?? null; 
        const offsetY = spec.offsetY ?? CONFIG.PLAYER.BULLET_OFFSET_Y;

        let baseAngle = 270; 
        let angleStep = 0;
        let startAngle = 270; 

        if (pattern === 'SPIRAL') {
            startAngle = this._rotaryShotAngle; 
        }
        
        switch (pattern) {
            case 'FAN':
            case 'RANDOM':
                const arc = spec.angle || 60;
                startAngle = baseAngle - (arc / 2);
                angleStep = count > 1 ? arc / (count - 1) : 0;
                break;
            case 'RING':
                angleStep = 360 / count;
                startAngle = baseAngle;
                break;
            case 'STRAIGHT':
            default:
                angleStep = 0;
                break;
        }

        let wavyOffset = 0;
        if (wave) {
            const { speed: wavySpeed, range: wavyRange } = wave;
            const sineValue = Math.sin(this._shotWavyTimer * wavySpeed); 
            wavyOffset = sineValue * wavyRange; 
        }

        for (let i = 0; i < count; i++) {
            let currentAngleDeg = startAngle + (i * angleStep);
            
            if (pattern === 'RANDOM' && spec.angle) {
                const maxAngle = spec.angle / 2;
                const randomOffset = (Math.random() - 0.5) * maxAngle; 
                currentAngleDeg = baseAngle + randomOffset;
            }
            
            currentAngleDeg += wavyOffset;

            const angleRad = currentAngleDeg * (Math.PI / 180);

            const velX = speed * Math.cos(angleRad);
            const velY = speed * Math.sin(angleRad);
            
            const finalX = spec.spacing ? this.sprite.x + (i - (count - 1) / 2) * spec.spacing : this.sprite.x;

            this.emit(
                Player.SHOOT_EVENT,
                finalX,
                this.sprite.y - offsetY,
                velX,
                velY,
                textureKey, 
                scaleOpt,   
                speedOpt    
            );
        }
        
        if (pattern === 'SPIRAL' && spec.angle) {
            this._rotaryShotAngle = (this._rotaryShotAngle + spec.angle) % 360;
        }
    }

    public handleInput(input: InputManager, delta: number): void {
        const moveSpeed = CONFIG.PLAYER.SPEED * delta;

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

        // --- ショット定義 ---

        // KeyA: 基本ショット (STRAIGHT)
        if (input.isDown("KeyA")) {
            if (now - this.lastShotTime > 150) {
                this.fire({ pattern: "STRAIGHT", count: 1, speed: 600 });
                this.lastShotTime = now;
            }
        }

        // KeyS: 扇形ショット (FAN)
        if (input.isDown("KeyS")) {
            if (now - this.lastShotTime > 250) {
                this.fire({ pattern: "FAN", count: 7, speed: 550, angle: 90 });
                this.lastShotTime = now;
            }
        }

        // KeyD: ロータリーショット (SPIRAL)
        if (input.isDown("KeyD")) {
            if (now - this.lastShotTime > 20) {
                this.fire({
                    pattern: "SPIRAL",
                    count: 1,
                    speed: 400,
                    angle: 15,
                });
                this.lastShotTime = now;
            }
        }

        // KeyF: 行ったり来たりする直線弾 (Wavy Straight Shot)
        if (input.isDown("KeyF")) {
            if (now - this.lastShotTime > 100) {
                this.fire({
                    pattern: "STRAIGHT",
                    count: 4,
                    spacing: 30,
                    speed: 600,
                    wave: { speed: 5, range: 30 },
                    scale: { rate: -0.5, initial: 1.2 },
                });
                this.lastShotTime = now;
            }
        }

        // KeyG: 加速しながら縮小するショット
        if (input.isDown("KeyG")) {
            if (now - this.lastShotTime > 150) {
                this.fire({
                    pattern: "STRAIGHT",
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

        // KeyW: 鼓動する全方位ショット (Pulsing Ring)
        if (input.isDown("KeyW")) {
            if (now - this.lastShotTime > 1000) {
                this.fire({
                    pattern: "RING",
                    count: 16,
                    speed: 150,
                    scale: {
                        mode: "SINE",
                        rate: 4.0,
                        minScale: 0.8,
                        maxScale: 1.8,
                    },
                    wave: { speed: 3, range: 15 },
                });
                this.lastShotTime = now;
            }
        }

        // KeyQ: 複合ショット (Wavy Fan + Growing Straight)
        if (input.isDown("KeyQ")) {
            if (now - this.lastShotTime > 500) {
                this.fire({
                    pattern: "FAN",
                    count: 5,
                    speed: 400,
                    angle: 45,
                    wave: { speed: 3, range: 15 },
                });

                this.fire({
                    pattern: "STRAIGHT",
                    count: 2,
                    speed: 300,
                    spacing: 30,
                    scale: { mode: "LINEAR", rate: 1.0, maxScale: 3.0 },
                });

                this.lastShotTime = now;
            }
        }
    }
}