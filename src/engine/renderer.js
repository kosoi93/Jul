// Stage 7: Input (Renderer update for ready message)
import { SpriteAnimation } from './utils.js';

export class Renderer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.lastRenderTime = 0;

        this.backgroundLayers = [
            { color: 'rgba(20, 20, 40, 0.8)', speedMultiplier: 0.2, offsetX: 0 },
            { color: 'rgba(30, 30, 60, 0.7)', speedMultiplier: 0.5, offsetX: 0 },
            { color: 'rgba(50, 0, 80, 0.5)', speedMultiplier: 1.0, offsetX: 0 }
        ];

        this.playerAnimation = new SpriteAnimation(
            'assets/sprites/placeholder.png', 72, 72, 10, 0.1, true
        );
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
            this.ctx.fillStyle = layer.color;
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
                this.ctx.fillStyle = obstacle.color;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });
    }

    renderFrame(fps, player, activeObstacles, gameState) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawParallaxBackground();

        if (player) this.drawPlayer(player);
        if (activeObstacles) this.drawObstacles(activeObstacles);

        if (fps) {
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = '#0FF';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`FPS: ${Math.round(fps)}`, 10, 30);
        }

        if (gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 30);
            this.ctx.font = '30px Arial';
            this.ctx.fillText('Press Jump to Restart', this.width / 2, this.height / 2 + 30);
        } else if (gameState === 'ready') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('NEON RUNNER', this.width / 2, this.height / 2 - 60);
            this.ctx.font = '30px Arial';
            this.ctx.fillText('Press Jump or Swipe Up to Start', this.width / 2, this.height / 2);
        }
    }
}
