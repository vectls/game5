// src/entities/Enemy.ts
import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";

export class Enemy extends GameObject {
    constructor(texture: Texture) {
        super(
            texture,
            texture.width * 0.8, // ヒットボックス幅を少し小さく設定
            texture.height * 0.8 // ヒットボックス高さを少し小さく設定
        );
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
