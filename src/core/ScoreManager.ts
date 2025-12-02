// src/core/ScoreManager.ts
export class ScoreManager {
  private score: number = 0;

  public getScore(): number {
    return this.score;
  }

  public addScore(points: number): void {
    this.score += points;
    this.notifyScoreUpdate();
  }

  private notifyScoreUpdate() {
    // TODO: ここにPixi.jsのTextオブジェクトを更新するロジックを追加
    console.log(`Score: ${this.score}`); 
  }
}