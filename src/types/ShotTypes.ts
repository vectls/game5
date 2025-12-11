// src/types/ShotTypes.ts

/** 弾丸の発射パターンを定義する定数オブジェクト */
export const ShotPatterns = {
    STRAIGHT: 'STRAIGHT',
    FAN: 'FAN',
    RING: 'RING',
    SPIRAL: 'SPIRAL',
    RANDOM: 'RANDOM',
} as const;

/** ショットの基本パターン (ShotPatternsの値から型を抽出) */
export type ShotPattern = typeof ShotPatterns[keyof typeof ShotPatterns];

// --- サイズ変化オプション ---
/** サイズ変化モードを定義する定数オブジェクト */
export const ScaleModes = {
    LINEAR: 'LINEAR', // 一直線に変化
    SINE: 'SINE',     // 波状に揺らぐ
} as const;

/** サイズ変化のモード */
export type ScaleMode = typeof ScaleModes[keyof typeof ScaleModes];

/** 弾丸のサイズ変化オプション */
export interface ScaleOption {
    mode?: ScaleMode;
    rate: number; // 1秒あたりの変化量 or SINEの周波数
    minScale?: number;
    maxScale?: number;
    initial?: number;
}

// --- 角度揺らぎオプション ---
/** 弾丸の発射時の角度揺らぎオプション（Wavy Angle） */
export interface WavyAngleOption {
    speed: number;    // 揺れる速さ (周波数)
    range: number;    // 揺れる幅 (角度・度数)
}

// --- 速度変化オプション ---
/** 弾丸の速度変化オプション (Acceleration/Deceleration) */
export interface SpeedOption {
    rate: number; // 1秒あたりの速度変化量 (ピクセル/秒^2)。+で加速、-で減速。
}

// --- 最終仕様書 ---
/** Playerのfireメソッドに渡すショットの仕様書 */
export interface ShotSpec {
    pattern: ShotPattern;
    count: number;
    speed: number; // 発射速度 (ピクセル/秒)
    
    // FAN, RANDOM, SPIRALで使用
    angle?: number; // FAN/RANDOMの場合は扇形の角度(度数)。SPIRALの場合は回転ステップの角度。

    // STRAIGHTで使用
    spacing?: number; // 複数弾発射時のX軸方向の間隔

    // オプション
    scale?: ScaleOption; // サイズ変化
    wave?: WavyAngleOption; // 発射角度の揺らぎ
    speedMod?: SpeedOption; // 速度変化（加速/減速）
    textureKey?: string; // 使用するテクスチャのキー
    offsetY?: number; // プレイヤーからのY軸オフセット
}