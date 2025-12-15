// src/types/ShotTypes.ts

// --- 1. 発射時の配置 (Pattern) ---
/** 弾丸の発射パターンを定義する定数オブジェクト (発射時の配置) */
export const ShotPatterns = {
    LINE: 'LINE',   // 機体前方などに並列に配置
    FAN: 'FAN',     // 扇形に広がる
    RING: 'RING',   // 360度均等に広がる
} as const;
export type ShotPattern = typeof ShotPatterns[keyof typeof ShotPatterns];

// --- 2. 方向の動かし方 (Trajectory) ---
export const TrajectoryModes = {
    FIXED: 'FIXED',   // 角度固定 (デフォルト)
    ROTARY: 'ROTARY', // 発射するたびに角度が回転
    WAVE: 'WAVE',     // 角度がサイン波のように揺れる
} as const;
export type TrajectoryMode = typeof TrajectoryModes[keyof typeof TrajectoryModes];

/** ショットの軌道変化オプション */
export interface TrajectoryOption {
    mode: TrajectoryMode;
    rate: number;   // ROTARY: 1発あたりの回転角度 (度) / WAVE: 揺れる速さ (周波数)
    range?: number; // WAVE: 揺れる幅 (角度・度数)
}

// --- 3. 弾丸自体の変化 (Bullet Effects) ---
// サイズ変化モード
export const ScaleModes = {
    LINEAR: 'LINEAR',
    SINE: 'SINE',
} as const;
export type ScaleMode = typeof ScaleModes[keyof typeof ScaleModes];

/** 弾丸のサイズ変化オプション */
export interface ScaleOption {
    mode?: ScaleMode;
    rate: number; // 1秒あたりの変化量 or SINEの周波数
    minScale?: number;
    maxScale?: number;
    initial?: number;
}

/** 弾丸の速度変化オプション (Acceleration/Deceleration) */
export interface SpeedOption {
    rate: number; // 1秒あたりの速度変化量 (ピクセル/秒^2)
}

// --- 最終仕様書 ---
/** Playerのfireメソッドに渡すショットの仕様書 */
export interface ShotSpec {
    // 1. 発射時の配置 (Pattern)
    pattern: ShotPattern;
    count: number;
    speed: number; // 発射速度 (ピクセル/秒)
    
    // Patternごとの設定
    angle?: number; // FAN: 扇形の角度 (度数)
    spacing?: number; // LINE: X軸方向の間隔

    // 2. 方向の動かし方 (Trajectory)
    trajectory?: TrajectoryOption;

    // 3. 弾丸自体の変化 (Bullet Effects)
    scale?: ScaleOption;
    speedMod?: SpeedOption;
    textureKey?: string; 
    offsetY?: number; 
    
    // 💡 修正: 弾が消える際に発射する子弾の仕様 (再帰的にShotSpecを保持)
    onDeathShot?: ShotSpec | undefined; // ' | null' を削除
    
    // 🚀 【新規追加】基本の発射角度（度数）
    baseAngleDeg?: number;
}