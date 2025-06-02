// Stage 10/Current: AudioManager Integration
import { Renderer } from './engine/renderer.js';
import { ObstaclePool, checkPlayerObstacleCollisions } from './engine/physics.js';
import { InputHandler } from './engine/input.js';
import { AudioManager } from './engine/audio.js'; // Import AudioManager
import { track, shareScore } from './engine/utils.js'; // track is already imported for analytics, add shareScore

export const BUILD_VERSION = '0.1.0';

const GAME_STATE = {
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    READY: 'ready'
};

const PLAYER_JUMP_VELOCITY = -700;
const GRAVITY = 2000;
const GROUND_Y_OFFSET = 50;
const INITIAL_HERO_SPEED = 250;
const SPEED_INCREASE_INTERVAL = 15;
const SPEED_INCREASE_AMOUNT = 25;
const NEON_PHASE_DURATION = 10;
const SCORE_PER_FRAME = 1;


class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 720;
        this.height = 1280;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.renderer = new Renderer(this.ctx, this.width, this.height);
        this.obstaclePoolManager = new ObstaclePool(this.height);
        this.inputHandler = new InputHandler(this.canvas);
        this.audioManager = new AudioManager(); // Instantiate AudioManager

        this.baseHeroSpeed = INITIAL_HERO_SPEED;
        this.currentHeroSpeed = 0;
        this.fps = 0;
        this.lastFpsUpdateTime = 0;
        this.framesThisSecond = 0;
        this.gameTime = 0;
        this.sessionStartTime = 0; // For game session duration tracking
        this.timeSinceLastSpeedIncrease = 0;
        this.gameState = GAME_STATE.READY;

        this.score = 0;
        this.highScore = 0;

        this.isNeonPhase = false;
        this.neonPhaseTimer = 0;

        console.log(`Neon Runner Version: ${BUILD_VERSION} initializing...`);

        this.player = {
            x: 100,
            y: this.height - 72 - GROUND_Y_OFFSET,
            width: 72,
            height: 72,
            velocityY: 0,
            isJumping: false,
            isSliding: false,
            baseY: this.height - 72 - GROUND_Y_OFFSET,
            slideDuration: 0.5,
            slideTimer: 0
        };

        this.activeObstacles = this.obstaclePoolManager.activeObstacles;
    }

    loadHighScore() {
        const storedHighScore = localStorage.getItem('neonRunnerHighScore');
        if (storedHighScore) {
            this.highScore = parseInt(storedHighScore, 10);
        } else {
            this.highScore = 0;
        }
    }

    saveHighScore() {
        localStorage.setItem('neonRunnerHighScore', this.highScore.toString());
    }

    init() {
        // AudioContext often needs to be resumed after user interaction
        // this.audioManager.resumeContext(); // Call this on first user gesture
        this.loadHighScore();
        this.inputHandler.init();
        this.adjustCanvasSize();
        window.addEventListener('resize', () => this.adjustCanvasSize());
        this.resetGame();
        this.showReadyMessage();
    }

    showReadyMessage() {
        console.log("Game Ready. Press Jump to Start.");
    }

    startGame() {
        if (this.gameState === GAME_STATE.READY) {
            this.audioManager.resumeContext(); // Good place for this
            this.gameState = GAME_STATE.PLAYING;
            this.currentHeroSpeed = this.baseHeroSpeed;
            this.gameTime = 0;
            this.sessionStartTime = performance.now();
            track('game_start');
            this.timeSinceLastSpeedIncrease = 0;
            this.score = 0;
            this.isNeonPhase = false;
            this.neonPhaseTimer = 0;
            this.renderer.playerAnimation.loop = true;
            this.renderer.playerAnimation.currentFrameIndex = 0;
            this.renderer.playerAnimation.elapsedTime = 0;
            this.renderer.setNeonPhase(false);
            this.audioManager.playMusic('music_loop1');
            const shareBtn = document.getElementById('shareBtn');
            if (shareBtn) { // Hide share button when a new game starts
                shareBtn.style.display = 'none';
            }
        }
    }

    resetGame() {
        this.gameState = GAME_STATE.READY;
        this.currentHeroSpeed = 0;
        this.gameTime = 0;
        this.timeSinceLastSpeedIncrease = 0;
        this.isNeonPhase = false;
        this.neonPhaseTimer = 0;

        this.player.x = 100;
        this.player.isJumping = false;
        this.player.isSliding = false;
        this.player.slideTimer = 0;
        this.player.velocityY = 0;
        this.player.y = this.player.baseY;
        this.renderer.playerAnimation.loop = true;
        this.renderer.playerAnimation.currentFrameIndex = 0;
        this.renderer.playerAnimation.elapsedTime = 0;
        this.renderer.setNeonPhase(false);

        this.activeObstacles.forEach(obs => obs.reset());
        this.activeObstacles.length = 0;
        this.obstaclePoolManager.spawnTimer = 0;
        this.obstaclePoolManager.timeToNextSpawn = this.obstaclePoolManager._getRandomSpawnTime();

        this.inputHandler.consumeJump();
        this.inputHandler.slideActive = false;

        this.loadHighScore();
        this.audioManager.stopMusic();
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) { // Check if shareBtn exists
          shareBtn.style.display = 'none';
        }
        this.showReadyMessage();
    }

    adjustCanvasSize() {
        const aspectRatio = this.width / this.height;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (windowWidth / windowHeight > aspectRatio) {
            this.canvas.style.height = `${windowHeight}px`;
            this.canvas.style.width = `${windowHeight * aspectRatio}px`;
        } else {
            this.canvas.style.width = `${windowWidth}px`;
            this.canvas.style.height = `${windowWidth / aspectRatio}px`;
        }
    }

    handleInput(dt) {
        if (this.inputHandler.jumpPressed) {
            if (this.gameState === GAME_STATE.READY) {
                this.startGame();
            } else if (this.gameState === GAME_STATE.PLAYING && !this.player.isJumping && !this.player.isSliding) {
                this.player.isJumping = true;
                this.player.velocityY = PLAYER_JUMP_VELOCITY;
                this.audioManager.playSFX('jump');
                this.renderer.showSubtitle("Jump!");
            } else if (this.gameState === GAME_STATE.GAME_OVER) {
                this.score = 0;
                this.resetGame();
            }
            this.inputHandler.consumeJump();
        }

        if (this.gameState === GAME_STATE.PLAYING) {
            if (this.inputHandler.slideActive && !this.player.isJumping && !this.player.isSliding) {
                this.player.isSliding = true;
                this.player.slideTimer = this.player.slideDuration;
                this.audioManager.playSFX('slide');
                this.renderer.showSubtitle("Slide!");
            }
        }
    }

    updatePlayer(dt) {
        if (this.player.isJumping) {
            this.player.y += this.player.velocityY * dt;
            this.player.velocityY += GRAVITY * dt;

            if (this.player.y >= this.player.baseY) {
                this.player.y = this.player.baseY;
                this.player.isJumping = false;
                this.player.velocityY = 0;
            }
        }

        if (this.player.isSliding) {
            this.player.slideTimer -= dt;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
            }
        }
        if (this.player.y < 0) this.player.y = 0;
    }

    enterNeonPhase() {
        this.isNeonPhase = true;
        this.neonPhaseTimer = NEON_PHASE_DURATION;
        this.currentHeroSpeed *= 1.20;
        this.renderer.setNeonPhase(true);
        this.audioManager.playSFX('neonPhase'); // Name should match a file like neonPhase.ogg/mp3
        this.audioManager.playMusic('music_loop2_neon'); // Name should match music_loop2_neon.ogg/mp3
        this.renderer.showSubtitle("Neon Phase!", 2500);
        console.log("NEON PHASE ACTIVATED! Speed:", this.currentHeroSpeed);
    }

    updateNeonPhase(dt) {
        if (this.isNeonPhase) {
            this.neonPhaseTimer -= dt;
            if (this.neonPhaseTimer <= 0) {
                this.isNeonPhase = false;
                let timeBasedSpeed = this.baseHeroSpeed;
                const speedIncreases = Math.floor(this.gameTime / SPEED_INCREASE_INTERVAL);
                timeBasedSpeed += speedIncreases * SPEED_INCREASE_AMOUNT;
                this.currentHeroSpeed = timeBasedSpeed;

                this.renderer.setNeonPhase(false);
                this.audioManager.playMusic('music_loop1');
                console.log("Neon Phase deactivated. Speed:", this.currentHeroSpeed);
            }
        }
    }

    update(dt, currentTime) {
        this.audioManager.resumeContext(); // Call resume on user interaction or updates
        this.handleInput(dt);

        if (this.gameState === GAME_STATE.PLAYING) {
            this.gameTime += dt;
            this.timeSinceLastSpeedIncrease += dt;
            this.score += SCORE_PER_FRAME;

            this.updatePlayer(dt);
            this.updateNeonPhase(dt);

            if (!this.isNeonPhase && this.timeSinceLastSpeedIncrease >= SPEED_INCREASE_INTERVAL) {
                this.baseHeroSpeed += SPEED_INCREASE_AMOUNT;
                this.currentHeroSpeed = this.baseHeroSpeed;
                this.timeSinceLastSpeedIncrease = 0;
                console.log("Speed increased to:", this.baseHeroSpeed);
            }

            if (!this.isNeonPhase && Math.floor(this.gameTime / 30) > Math.floor((this.gameTime - dt) / 30) && this.gameTime > 1) {
                 this.enterNeonPhase();
            }

            const newObstacle = this.obstaclePoolManager.spawnObstacleIfNeeded(dt, this.width);
            if (newObstacle && !this.activeObstacles.includes(newObstacle)) {
                this.activeObstacles.push(newObstacle);
            }

            this.obstaclePoolManager.updateActiveObstacles(dt, this.currentHeroSpeed);
            this.renderer.updateBackground(dt, this.currentHeroSpeed);

            if (checkPlayerObstacleCollisions(this.player, this.activeObstacles)) {
                this.gameState = GAME_STATE.GAME_OVER;
                this.currentHeroSpeed = 0;
                this.renderer.playerAnimation.loop = false;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveHighScore();
                }
                const gameDurationMs = Math.round(performance.now() - this.sessionStartTime);
                track('game_over', { score: this.score, duration: gameDurationMs });
                console.log("Game Over! Score:", this.score, "High Score:", this.highScore, "Duration:", gameDurationMs, "ms");

                this.audioManager.stopMusic();
                this.audioManager.playSFX('crash');
                this.renderer.showSubtitle("Crash!", 2000);
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
                this.renderer.triggerScreenFlash(150);
                const shareBtn = document.getElementById('shareBtn');
                if (shareBtn && 'share' in navigator && navigator.canShare) { // Check again before showing
                    shareBtn.style.display = 'block';
                }
            }
        }

        this.renderer.updateEntities(dt);
        this.renderer.updateEffects(dt);

        this.framesThisSecond++;
        if (currentTime >= this.lastFpsUpdateTime + 1000) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.lastFpsUpdateTime = currentTime;
        }
    }

    render() {
        this.renderer.renderFrame(
            this.fps,
            this.player,
            this.activeObstacles,
            this.gameState,
            this.score,
            this.highScore
        );
    }
}

// --- Main Execution ---
const canvasElement = document.getElementById('game');
if (canvasElement) {
    const game = new Game(canvasElement);

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn && 'share' in navigator && navigator.canShare) { // Check API availability early
        shareBtn.addEventListener('click', () => {
            if (game && game.highScore !== undefined && game.canvas) { // Ensure game context is valid
                shareScore(game.highScore, game.canvas);
            }
        });
    } else if (shareBtn) {
        shareBtn.style.display = 'none'; // Hide if API not supported at all
    }

    game.init();

    let lastTime = performance.now();

    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        game.update(deltaTime, currentTime);
        game.render();

        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
} else {
    console.error('Canvas element with ID "game" not found!');
}
