// src/core/ObjectPool.ts
import { Container } from "pixi.js"; 

// Tのresetメソッドの引数を抽出するためのヘルパー型
// NOTE: `reset` の引数型を推論し、それをタプルとして返す
type ResetArgs<T extends Poolable> = T extends { reset(...args: infer A): void } ? A : never;

// プールで管理するオブジェクトが満たすべき条件
export interface Poolable {
  active: boolean;
  sprite: Container;
  // resetメソッドは、具象クラスに応じて様々な引数を取れるように定義を保持
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
  // ★ 変更点: getメソッドの引数を ResetArgs<T> で型安全にする
  public get(...args: ResetArgs<T>): T {
    let obj = this.pool.find((p) => !p.active);
    if (!obj) {
      obj = this.createObject();
      this.pool.push(obj);
    }
    
    obj.active = true;
    obj.sprite.visible = true;
    
    // resetの呼び出しも型安全になる
    (obj.reset as (...args: ResetArgs<T>) => void)(...args);
    return obj;
  }

  // オブジェクトを返却（非アクティブ化）
  public release(obj: T) {
    obj.active = false;
    obj.sprite.visible = false;
  }
}