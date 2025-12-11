// src/entities/GameObject.ts
import { Sprite, Texture } from "pixi.js";
import type { Poolable } from "../core/ObjectPool";

export interface Collider {
    x: number;
    y: number;
    hitWidth: number;
    hitHeight: number;

    get top(): number;
    get bottom(): number;
    get left(): number;
    get right(): number;
}

export abstract class GameObject implements Poolable, Collider {
    public sprite: Sprite;
    public active: boolean = false;

    protected _hitWidth: number;
    protected _hitHeight: number;

    public get x() {
        return this.sprite.x;
    }
    public get y() {
        return this.sprite.y;
    }

    public get hitWidth() {
        return this._hitWidth;
    }
    public get hitHeight() {
        return this._hitHeight;
    }

    public get top(): number {
        return this.y - this.hitHeight / 2;
    }
    public get bottom(): number {
        return this.y + this.hitHeight / 2;
    }
    public get left(): number {
        return this.x - this.hitWidth / 2;
    }
    public get right(): number {
        return this.x + this.hitWidth / 2;
    }

    constructor(texture: Texture, hitWidth: number, hitHeight: number) {
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.visible = false;

        this._hitWidth = hitWidth;
        this._hitHeight = hitHeight;
    }

    abstract update(delta: number): void;
    abstract reset(...args: any[]): void;
}