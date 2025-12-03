// src/utils/CollisionUtils.ts
import { GameObject } from "../entities/GameObject";

/**
 * 2つのGameObjectのAABB（軸並行境界ボックス）衝突をチェックする。
 * オブジェクトのx/y座標は中心を指すことを前提とする。
 * @param objA 衝突判定を行うGameObject A
 * @param objB 衝突判定を行うGameObject B
 * @returns 衝突している場合は true
 */
export function checkAABBCollision(objA: GameObject, objB: GameObject): boolean {
    // 中心座標とヒットサイズを使用したAABB衝突判定
    const dx = Math.abs(objA.x - objB.x);
    const dy = Math.abs(objA.y - objB.y);

    // 衝突に必要な境界の最小距離 (両オブジェクトの半分の幅/高さを合計したもの)
    const totalHalfWidth = objA.hitWidth / 2 + objB.hitWidth / 2;
    const totalHalfHeight = objA.hitHeight / 2 + objB.hitHeight / 2;

    // x軸とy軸の両方で重なりがあるかを確認
    return dx < totalHalfWidth && dy < totalHalfHeight;
}