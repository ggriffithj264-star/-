
export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  radius: number;
  color: string;
}

export interface Bullet extends Entity {
  velocity: Vector2;
}

export interface Enemy extends Entity {
  health: number;
  maxHealth: number;
  type: 'basic' | 'fast' | 'heavy';
  score: number;
}

export interface GameState {
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPaused: boolean;
}
