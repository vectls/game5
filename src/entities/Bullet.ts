// src/entities/Bullet.ts

import { Texture } from "pixi.js";
import { GameObject } from "./GameObject";
import { CONFIG } from "../config";
import { ScaleModes, type ScaleOption, type SpeedOption } from "../types/ShotTypes"; 

export class Bullet extends GameObject {
  private velX: number = 0; 
  private velY: number = 0; 
  private lifeTime: number = 0; 

  private scaleOpt: ScaleOption | null = null;
  private currentMinScale: number = 0.1; 

  private speedOpt: SpeedOption | null = null; 

  constructor(texture: Texture) {
    const initialScale = 1.0; 
    super(texture, texture.width * initialScale * 0.5, texture.height * initialScale * 0.5);
    this.sprite.scale.set(initialScale); 
  }

  public setTexture(texture: Texture): void {
      this.sprite.texture = texture;
      this.updateHitbox(this.sprite.scale.x); 
  }
  
  reset(
    x: number, 
    y: number, 
    velX: number, 
    velY: number, 
    scaleOpt: ScaleOption | null = null, 
    speedOpt: SpeedOption | null = null, 
  ) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.active = true; 
    this.sprite.visible = true; 
    this.lifeTime = 0; 

    this.scaleOpt = scaleOpt;
    this.speedOpt = speedOpt; 
    const initialScale = scaleOpt?.initial ?? 1.0;
    this.currentMinScale = scaleOpt?.minScale ?? 0.1; 
    this.sprite.scale.set(initialScale);
    
    this.velX = velX;
    this.velY = velY;

    this.updateHitbox(initialScale);
    this.sprite.rotation = Math.atan2(velY, velX) + Math.PI / 2;
  }

  private updateHitbox(newScale: number) {
    this._hitWidth = this.sprite.texture.width * newScale * 0.5;
    this._hitHeight = this.sprite.texture.height * newScale * 0.5;
  }

  private handleSpeed(delta: number) {
      if (!this.speedOpt) return;

      const currentSpeedSq = this.velX * this.velX + this.velY * this.velY;
      if (currentSpeedSq === 0) return; 

      const currentSpeed = Math.sqrt(currentSpeedSq);
      
      let newSpeed = currentSpeed + this.speedOpt.rate * delta;
      
      if (newSpeed <= 0) {
          this.active = false; 
          this.sprite.visible = false;
          return;
      }
      
      const ratio = newSpeed / currentSpeed; 
      
      this.velX *= ratio; 
      this.velY *= ratio; 
  }

  private handleScale(delta: number) {
      if (!this.scaleOpt) return;
      let newScale = this.sprite.scale.x;
      const opt = this.scaleOpt;
      const maxScale = opt.maxScale ?? 1.0;

      if (opt.mode === ScaleModes.SINE) {
          const minScale = opt.minScale ?? 0.1;
          const range = maxScale - minScale;
          const base = minScale + range / 2;
          newScale = base + (range / 2) * Math.sin(this.lifeTime * opt.rate);
      } else { 
          newScale = this.sprite.scale.x + opt.rate * delta;
          
          if (opt.rate > 0) { 
              newScale = Math.min(maxScale, newScale);
          } else { 
              newScale = Math.max(this.currentMinScale, newScale);
          }
      }

      if (newScale !== this.sprite.scale.x) {
          this.sprite.scale.set(newScale);
          this.updateHitbox(newScale);
      }
      
      if (newScale <= this.currentMinScale * 0.2) { 
          this.active = false;
          this.sprite.visible = false;
      }
  }

  update(delta: number) {
    if (!this.active) return;
    this.lifeTime += delta; 

    this.handleScale(delta); 
    this.handleSpeed(delta); 

    this.sprite.x += this.velX * delta;
    this.sprite.y += this.velY * delta;

    if (
      this.sprite.x < -CONFIG.SCREEN.MARGIN ||
      this.sprite.x > CONFIG.SCREEN.WIDTH + CONFIG.SCREEN.MARGIN ||
      this.sprite.y < -CONFIG.SCREEN.MARGIN ||
      this.sprite.y > CONFIG.SCREEN.HEIGHT + CONFIG.SCREEN.MARGIN
    ) {
      this.active = false;
      this.sprite.visible = false;
    }
  }
}