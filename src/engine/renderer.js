// Stage 10: Finalization - Accessibility (Reduced Motion, Subtitles)
import { SpriteAnimation } from './utils.js';

export class Renderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.lastRenderTime = 0;

        this.isNeonPhaseActive = false;
        this.screenFlashAlpha = 0;
        this.screenFlashDuration = 0;
        this.screenFlashTimer = 0;

        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.subtitleText = "";
        this.subtitleTimer = 0;

        this.backgroundLayers = [
            { color: 'rgba(20, 20, 40, 0.8)', speedMultiplier: 0.2, offsetX: 0, neonColor: 'rgba(60, 0, 90, 0.8)' },
            { color: 'rgba(30, 30, 60, 0.7)', speedMultiplier: 0.5, offsetX: 0, neonColor: 'rgba(90, 20, 120, 0.7)' },
            { color: 'rgba(50, 0, 80, 0.5)', speedMultiplier: 1.0, offsetX: 0, neonColor: 'rgba(120, 0, 150, 0.5)' }
        ];

        this.playerAnimation = new SpriteAnimation(
            'assets/sprites/placeholder.png', 72, 72, 10, 0.1, true
        );
    }

    setNeonPhase(isActive) {
        this.isNeonPhaseActive = isActive;
    }

    triggerScreenFlash(durationMs) {
        if (this.prefersReducedMotion) return; // Respect user preference
        this.screenFlashDuration = durationMs;
        this.screenFlashTimer = durationMs;
        this.screenFlashAlpha = 1.0;
    }

    showSubtitle(text, durationMs = 1500) {
        this.subtitleText = text;
        this.subtitleTimer = durationMs;
    }

    updateEffects(dt) { // dt is in seconds
        if (this.screenFlashTimer > 0 && !this.prefersReducedMotion) {
            this.screenFlashTimer -= dt * 1000;
            if (this.screenFlashTimer <= 0) {
                this.screenFlashAlpha = 0;
                this.screenFlashTimer = 0;
            } else {
                this.screenFlashAlpha = this.screenFlashTimer / this.screenFlashDuration;
            }
        }

        if (this.subtitleTimer > 0) {
            this.subtitleTimer -= dt * 1000;
            if (this.subtitleTimer <= 0) {
                this.subtitleText = "";
                this.subtitleTimer = 0;
            }
        }
    }

    updateBackground(dt, heroSpeed) {
        this.backgroundLayers.forEach(layer => {
            layer.offsetX -= heroSpeed * layer.speedMultiplier * dt;
            if (layer.offsetX < -this.width) {
                layer.offsetX += this.width;
            }
        });
    }

    updateEntities(dt) {
        this.playerAnimation.update(dt);
    }

    drawParallaxBackground() {
        this.backgroundLayers.forEach(layer => {
            this.ctx.fillStyle = this.isNeonPhaseActive ? layer.neonColor : layer.color;
            this.ctx.fillRect(layer.offsetX, 0, this.width, this.height);
            this.ctx.fillRect(layer.offsetX + this.width, 0, this.width, this.height);
        });
    }

    drawPlayer(player) {
        if(player) this.playerAnimation.draw(this.ctx, player.x, player.y);
    }

    drawObstacles(obstacles) {
        obstacles.forEach(obstacle => {
            if (obstacle.isActive) {
                this.ctx.fillStyle = this.isNeonPhaseActive ? '#FF00FF' : obstacle.color;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });
    }

    drawHUD(fps, score, highScore) {
        this.ctx.font = '28px Arial';
        this.ctx.fillStyle = '#0FF';
        this.ctx.textAlign = 'left';
        this.ctx.shadowColor = '#0FF'; // Add shadow for better readability
        this.ctx.shadowBlur = 5;

        if (fps) {
            this.ctx.fillText(`FPS: ${Math.round(fps)}`, 15, 40);
        }
        this.ctx.fillText(`Score: ${score}`, 15, 80);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`High: ${highScore}`, this.width - 15, 40);
        this.ctx.shadowBlur = 0; // Reset shadow
    }

    drawSubtitles() {
        if (this.subtitleText && this.subtitleTimer > 0) {
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000';
            this.ctx.shadowBlur = 3;
            // Position at bottom center
            this.ctx.fillText(this.subtitleText, this.width / 2, this.height - 30);
            this.ctx.shadowBlur = 0;
        }
    }

    renderFrame(fps, player, activeObstacles, gameState, score, highScore) {
        this.ctx.fillStyle = this.isNeonPhaseActive ? '#100018' : '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawParallaxBackground();

        if (player) this.drawPlayer(player);
        if (activeObstacles) this.drawObstacles(activeObstacles);

        this.drawHUD(fps, score, highScore);
        this.drawSubtitles();


        if (gameState === 'gameOver') {
            if (this.screenFlashAlpha > 0 && !this.prefersReducedMotion) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlashAlpha})`;
                this.ctx.fillRect(0, 0, this.width, this.height);
            }

            this.ctx.fillStyle = 'rgba(30, 30, 50, 0.85)'; // Darker box
            this.ctx.fillRect(this.width / 2 - 220, this.height / 2 - 120, 440, 240); // Slightly larger box

            this.ctx.fillStyle = '#FF0033';
            this.ctx.font = 'bold 60px Arial'; // Bolder
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#FF4D6D';
            this.ctx.shadowBlur = 10;
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);
            this.ctx.shadowBlur = 0;

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '30px Arial';
            this.ctx.fillText(`Score: ${score}`, this.width / 2, this.height / 2 + 20);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press Jump to Restart', this.width / 2, this.height / 2 + 70);

        } else if (gameState === 'ready') {
            this.ctx.fillStyle = 'rgba(0,0,0, 0.6)';
            this.ctx.fillRect(0,0, this.width, this.height);

            this.ctx.fillStyle = '#0FF';
            this.ctx.font = 'bold 70px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#0FF';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText('NEON RUNNER', this.width / 2, this.height / 2 - 100);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '30px Arial';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText('Press Jump or Swipe Up to Start', this.width / 2, this.height / 2 + 20);
        }

        if (gameState !== 'gameOver' && this.screenFlashAlpha > 0 && !this.prefersReducedMotion) {
             this.ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlashAlpha})`;
             this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
}
