// src/core/ScoreManager.ts

export class ScoreManager {
  private score: number = 0;

  public getScore(): number {
    return this.score;
  }

  public addScore(points: number): void {
    this.score += points;
    this.notifyScoreUpdate(); // スコア表示の更新を通知する関数（後で実装）
  }

  private notifyScoreUpdate() {
    // TODO: ここにPixi.jsのTextオブジェクトを更新するロジックや
    // イベントを発火させるロジックを追加します。
    console.log(`Score: ${this.score}`); 
  }
}