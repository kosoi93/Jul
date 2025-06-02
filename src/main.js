// Stage 7: Input Integration & Basic Physics
import { Renderer } from './engine/renderer.js';
import { ObstaclePool, checkPlayerObstacleCollisions } from './engine/physics.js';
import { InputHandler } from './engine/input.js'; // Import InputHandler

const GAME_STATE = {
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    READY: 'ready' // For initial screen before game starts
};

const PLAYER_JUMP_VELOCITY = -700; // px/s, negative is up
const GRAVITY = 2000; // px/s^2
const GROUND_Y_OFFSET = 50; // Distance from bottom of canvas considered "ground"

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

        this.heroSpeed = 250;
        this.currentHeroSpeed = 0; // Start at 0, game starts on first input
        this.fps = 0;
        this.lastFpsUpdateTime = 0;
        this.framesThisSecond = 0;
        this.gameTime = 0;
        this.gameState = GAME_STATE.READY;

        this.player = {
            x: 100,
            y: this.height - 72 - GROUND_Y_OFFSET,
            width: 72,
            height: 72,
            velocityY: 0,
            isJumping: false,
            isSliding: false, // Will be controlled by input and timers/state
            baseY: this.height - 72 - GROUND_Y_OFFSET, // Ground Y position
            slideDuration: 0.5, // seconds
            slideTimer: 0
        };

        this.activeObstacles = this.obstaclePoolManager.activeObstacles;
    }

    init() {
        console.log("Neon Runner Initializing...");
        this.inputHandler.init();
        this.adjustCanvasSize();
        window.addEventListener('resize', () => this.adjustCanvasSize());
        this.resetGame(); // Sets to READY state
        this.showReadyMessage();
    }

    showReadyMessage() {
        // This will be drawn by the renderer in a "ready" state
        console.log("Game Ready. Press Jump to Start.");
    }

    startGame() {
        if (this.gameState === GAME_STATE.READY) {
            this.gameState = GAME_STATE.PLAYING;
            this.currentHeroSpeed = this.heroSpeed;
            this.gameTime = 0; // Reset game time
            // Player animation might need a specific start call if it's not looping by default
            this.renderer.playerAnimation.loop = true;
            this.renderer.playerAnimation.currentFrameIndex = 0; // Start from first frame
            this.renderer.playerAnimation.elapsedTime = 0;
        }
    }

    resetGame() {
        this.gameState = GAME_STATE.READY;
        this.currentHeroSpeed = 0; // Stop movement until game starts
        this.gameTime = 0;

        this.player.x = 100;
        this.player.isJumping = false;
        this.player.isSliding = false;
        this.player.slideTimer = 0;
        this.player.velocityY = 0;
        this.player.y = this.player.baseY;
        this.renderer.playerAnimation.loop = true; // Ensure animation can loop
        this.renderer.playerAnimation.currentFrameIndex = 0; // Reset animation
        this.renderer.playerAnimation.elapsedTime = 0;


        this.activeObstacles.forEach(obs => obs.reset());
        this.activeObstacles.length = 0;
        this.obstaclePoolManager.spawnTimer = 0;
        this.obstaclePoolManager.timeToNextSpawn = this.obstaclePoolManager._getRandomSpawnTime();

        this.inputHandler.consumeJump(); // Clear any pending jump from game over screen
        this.inputHandler.slideActive = false; // Reset slide state

        console.log("Game Reset to Ready State.");
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
            }
            if (this.gameState === GAME_STATE.PLAYING && !this.player.isJumping && !this.player.isSliding) {
                this.player.isJumping = true;
                this.player.velocityY = PLAYER_JUMP_VELOCITY;
                // Play jump sound (later)
            } else if (this.gameState === GAME_STATE.GAME_OVER) {
                this.resetGame(); // Jump to restart
            }
            this.inputHandler.consumeJump();
        }

        if (this.gameState === GAME_STATE.PLAYING) {
            if (this.inputHandler.slideActive && !this.player.isJumping && !this.player.isSliding) {
                this.player.isSliding = true;
                this.player.slideTimer = this.player.slideDuration;
                // Change player sprite/hitbox for sliding (later)
                // Play slide sound (later)
            }
            // If slide is activated by touch, it won't be "held".
            // So, if slideActive is set by touch, we might want to immediately reset it in inputHandler
            // or handle slide duration here.
            // For keyboard, slideActive is true while ArrowDown is held.
            // For now, this.player.isSliding is true for slideDuration.
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
                // Revert player sprite/hitbox (later)
            }
        }
        // Ensure player doesn't go above screen (e.g. if jump force too high)
        if (this.player.y < 0) this.player.y = 0;
    }

    update(dt, currentTime) {
        this.handleInput(dt);

        if (this.gameState === GAME_STATE.PLAYING) {
            this.gameTime += dt;
            this.updatePlayer(dt);

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
                console.log("Game Over!");
            }
        }

        // Always update player animation regardless of game state (e.g. for game over animation)
        this.renderer.updateEntities(dt);

        this.framesThisSecond++;
        if (currentTime >= this.lastFpsUpdateTime + 1000) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.lastFpsUpdateTime = currentTime;
        }
    }

    render() {
        this.renderer.renderFrame(this.fps, this.player, this.activeObstacles, this.gameState);
    }
}

// --- Main Execution ---
const canvasElement = document.getElementById('game');
if (canvasElement) {
    const game = new Game(canvasElement);
    game.init();

    let lastTime = performance.now();

    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        game.update(deltaTime, currentTime);
        game.render();

        requestAnimationFrame(gameLoop);
    }
    // Ensure canvas has focus for keyboard input
    // canvasElement.focus(); // Can also be done in init or after user interaction
    requestAnimationFrame(gameLoop);
} else {
    console.error('Canvas element with ID "game" not found!');
}
