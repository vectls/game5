// src/core/ScoreManager.ts

import { EventEmitter } from "pixi.js"; 

export class ScoreManager extends EventEmitter {
    // 1. 実際の値を保持する変数はプライベート (_score) にする
    private _score: number; 

    // 2. イベント定数を定義
    public static readonly SCORE_CHANGED_EVENT = "score_changed"; 

    constructor(initialScore: number = 0) {
        super();
        this._score = initialScore;
    }

    // 3. 🚀 修正点: 外部から値を読み取るための「パブリックゲッター」を定義
    //    main.ts からのアクセス (this.scoreManager.score) はこのゲッターを経由します。
    public get score(): number {
        return this._score;
    }

    public addScore(value: number): void {
        this._score += value;
        // スコアが変更されたときにイベントを発火
        this.emit(ScoreManager.SCORE_CHANGED_EVENT, this._score); 
    }

    public reset(): void {
        this._score = 0;
        this.emit(ScoreManager.SCORE_CHANGED_EVENT, this._score);
    }
}