
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vector2, Bullet, Enemy, GameState } from './types';

const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPAWN_RATE = 0.02;
const INITIAL_PLAYER_POS = { x: 0, y: 0 };

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('skyStrikeHighScore') || '0'),
    isGameOver: false,
    isPaused: true
  });

  // Game references (non-state for performance)
  const playerPos = useRef<Vector2>({ x: 0, y: 0 });
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const keys = useRef<{ [key: string]: boolean }>({});
  const animationFrameId = useRef<number>(0);
  const frameCount = useRef(0);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    playerPos.current = { x: canvas.width / 2, y: canvas.height * 0.8 };
    bullets.current = [];
    enemies.current = [];
    setGameState(prev => ({ ...prev, score: 0, isGameOver: false, isPaused: false }));
    frameCount.current = 0;
  }, []);

  const spawnEnemy = (width: number) => {
    const types: ('basic' | 'fast' | 'heavy')[] = ['basic', 'fast', 'heavy'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let health = 1;
    let radius = 15;
    let color = '#ef4444'; // Red-500
    let score = 10;

    if (type === 'fast') {
      health = 1;
      radius = 10;
      color = '#f59e0b'; // Amber-500
      score = 20;
    } else if (type === 'heavy') {
      health = 3;
      radius = 25;
      color = '#7c3aed'; // Violet-600
      score = 50;
    }

    enemies.current.push({
      id: Math.random().toString(36),
      pos: { x: Math.random() * (width - 40) + 20, y: -50 },
      radius,
      health,
      maxHealth: health,
      type,
      color,
      score
    });
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas || gameState.isPaused || gameState.isGameOver) return;

    frameCount.current++;

    // 1. Move Player
    if (keys.current['ArrowUp'] || keys.current['w']) playerPos.current.y -= PLAYER_SPEED;
    if (keys.current['ArrowDown'] || keys.current['s']) playerPos.current.y += PLAYER_SPEED;
    if (keys.current['ArrowLeft'] || keys.current['a']) playerPos.current.x -= PLAYER_SPEED;
    if (keys.current['ArrowRight'] || keys.current['d']) playerPos.current.x += PLAYER_SPEED;

    // Constrain player
    playerPos.current.x = Math.max(20, Math.min(canvas.width - 20, playerPos.current.x));
    playerPos.current.y = Math.max(20, Math.min(canvas.height - 20, playerPos.current.y));

    // 2. Shooting (Auto-shoot or space)
    if (frameCount.current % 8 === 0) {
      bullets.current.push({
        id: Math.random().toString(36),
        pos: { ...playerPos.current },
        radius: 4,
        color: '#38bdf8', // Sky-400
        velocity: { x: 0, y: -BULLET_SPEED }
      });
    }

    // 3. Move Bullets
    bullets.current.forEach(b => {
      b.pos.y += b.velocity.y;
    });
    bullets.current = bullets.current.filter(b => b.pos.y > -20);

    // 4. Spawn Enemies
    if (Math.random() < ENEMY_SPAWN_RATE + (gameState.score / 10000)) {
      spawnEnemy(canvas.width);
    }

    // 5. Move Enemies & Collision
    enemies.current.forEach(enemy => {
      const speed = enemy.type === 'fast' ? 4 : enemy.type === 'heavy' ? 1.5 : 2.5;
      enemy.pos.y += speed;

      // Player Collision
      const dx = enemy.pos.x - playerPos.current.x;
      const dy = enemy.pos.y - playerPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < enemy.radius + 15) {
        setGameState(prev => {
          const newHigh = Math.max(prev.score, prev.highScore);
          localStorage.setItem('skyStrikeHighScore', newHigh.toString());
          return { ...prev, isGameOver: true, highScore: newHigh };
        });
      }
    });

    // Bullet-Enemy Collision
    bullets.current.forEach((bullet, bIdx) => {
      enemies.current.forEach((enemy, eIdx) => {
        const dx = bullet.pos.x - enemy.pos.x;
        const dy = bullet.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < enemy.radius + bullet.radius) {
          enemy.health -= 1;
          bullets.current.splice(bIdx, 1);
          if (enemy.health <= 0) {
            setGameState(prev => ({ ...prev, score: prev.score + enemy.score }));
            enemies.current.splice(eIdx, 1);
          }
        }
      });
    });

    enemies.current = enemies.current.filter(e => e.pos.y < canvas.height + 50);

    draw();
    animationFrameId.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Starfield effect (static/simple)
    ctx.fillStyle = '#ffffff22';
    for(let i=0; i<50; i++) {
        const x = (i * 137) % canvas.width;
        const y = (i * 223 + frameCount.current) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }

    // Draw Player (Minimalist Jet)
    ctx.save();
    ctx.translate(playerPos.current.x, playerPos.current.y);
    
    // Engine Glow
    const glow = Math.sin(frameCount.current * 0.5) * 5 + 10;
    ctx.shadowBlur = glow;
    ctx.shadowColor = '#38bdf8';
    
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -20); // Nose
    ctx.lineTo(15, 10); // Right wing back
    ctx.lineTo(5, 5);   // Tail right
    ctx.lineTo(0, 15);  // Engine
    ctx.lineTo(-5, 5);  // Tail left
    ctx.lineTo(-15, 10); // Left wing back
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Bullets
    ctx.shadowBlur = 0;
    bullets.current.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Enemies
    enemies.current.forEach(e => {
      ctx.fillStyle = e.color;
      
      // Enemy Shape (Diamond/Hex)
      ctx.beginPath();
      ctx.moveTo(e.pos.x, e.pos.y - e.radius);
      ctx.lineTo(e.pos.x + e.radius, e.pos.y);
      ctx.lineTo(e.pos.x, e.pos.y + e.radius);
      ctx.lineTo(e.pos.x - e.radius, e.pos.y);
      ctx.closePath();
      ctx.fill();

      // Health Bar
      if (e.maxHealth > 1) {
          ctx.fillStyle = '#334155';
          ctx.fillRect(e.pos.x - e.radius, e.pos.y - e.radius - 10, e.radius * 2, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(e.pos.x - e.radius, e.pos.y - e.radius - 10, (e.radius * 2) * (e.health / e.maxHealth), 4);
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        if (gameState.isPaused && !gameState.isGameOver) {
            draw();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key] = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  useEffect(() => {
    if (!gameState.isPaused && !gameState.isGameOver) {
      animationFrameId.current = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(animationFrameId.current);
    }
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [gameState.isPaused, gameState.isGameOver]);

  return (
    <div className="relative w-full h-screen font-sans text-white select-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="text-sm uppercase tracking-widest text-slate-400">Score</div>
        <div className="text-3xl font-bold text-sky-400">{gameState.score.toLocaleString()}</div>
        <div className="mt-2 text-xs text-slate-500 uppercase">Best: {gameState.highScore.toLocaleString()}</div>
      </div>

      {/* Menus */}
      {gameState.isPaused && !gameState.isGameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm z-20">
          <h1 className="text-6xl font-black mb-8 tracking-tighter text-sky-500">SKY STRIKE</h1>
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center gap-6 max-w-sm">
            <p className="text-slate-300 text-center text-sm leading-relaxed">
              Use <span className="text-sky-400 font-mono">WASD</span> or <span className="text-sky-400 font-mono">Arrows</span> to move. 
              Combat systems are automated. Good luck, pilot.
            </p>
            <button 
              onClick={initGame}
              className="w-full bg-sky-500 hover:bg-sky-400 transition-colors py-4 px-12 rounded-xl text-xl font-bold shadow-lg shadow-sky-500/20"
            >
              LAUNCH MISSION
            </button>
          </div>
        </div>
      )}

      {gameState.isGameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-md z-30 animate-in fade-in duration-500">
          <div className="text-red-500 text-sm tracking-[0.4em] mb-2 font-bold uppercase">Signal Lost</div>
          <h2 className="text-7xl font-black text-white mb-2 italic">GAME OVER</h2>
          <div className="text-2xl text-slate-300 mb-8 font-light">Final Score: <span className="text-white font-bold">{gameState.score}</span></div>
          
          <button 
            onClick={initGame}
            className="group relative px-12 py-4 bg-white text-black font-black text-xl rounded-full hover:scale-105 transition-all active:scale-95"
          >
            REDEPLOY
            <div className="absolute inset-0 rounded-full border-2 border-white animate-ping opacity-25 group-hover:opacity-50"></div>
          </button>
        </div>
      )}

      {/* Bottom controls reminder for mobile feel */}
      {!gameState.isPaused && !gameState.isGameOver && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 uppercase tracking-widest opacity-50">
          Auto-firing Sequence Active • Infinite Ammunition
        </div>
      )}
    </div>
  );
};

export default App;
