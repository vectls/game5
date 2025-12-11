// src/utils/CollisionUtils.ts

import type { Collider } from "../entities/GameObject"; 

/**
 * 2つのGameObjectのAABB（軸並行境界ボックス）衝突をチェックする。
 * @param objA 衝突判定を行うGameObject A
 * @param objB 衝突判定を行うGameObject B
 * @returns 衝突している場合は true
 */
export function checkAABBCollision(objA: Collider, objB: Collider): boolean {
    return (
        objA.left < objB.right &&
        objA.right > objB.left &&
        objA.top < objB.bottom &&
        objA.bottom > objB.top
    );
}