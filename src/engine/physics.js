// Stage 6: Collision Detection
import { rand } from './utils.js';

const OBSTACLE_TYPES = {
    LOW: { width: 72, height: 72, color: '#F0F' },
    HIGH: { width: 72, height: 144, color: '#FF0' }
};
const MAX_OBSTACLES_IN_POOL = 15;
const HITBOX_SCALE_FACTOR = 0.8; // Hitbox is 80% of sprite size

export class Obstacle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.type = null;
        this.isActive = false;
        this.color = '#FFF';
    }

    init(type, x, y, gameHeight) {
        this.type = type;
        const config = OBSTACLE_TYPES[type];
        this.width = config.width;
        this.height = config.height;
        this.x = x;
        this.y = gameHeight - this.height - 50;
        this.color = config.color;
        this.isActive = true;
    }

    reset() {
        this.isActive = false;
    }

    update(dt, heroSpeed) {
        if (!this.isActive) return;
        this.x -= heroSpeed * dt;
    }

    getHitbox() {
        const w = this.width * HITBOX_SCALE_FACTOR;
        const h = this.height * HITBOX_SCALE_FACTOR;
        const x = this.x + (this.width - w) / 2;
        const y = this.y + (this.height - h) / 2;
        return { x, y, width: w, height: h };
    }
}

export class ObstaclePool {
    constructor(gameHeight) {
        this.pool = [];
        this.gameHeight = gameHeight;
        for (let i = 0; i < MAX_OBSTACLES_IN_POOL; i++) {
            this.pool.push(new Obstacle());
        }
        this.activeObstacles = [];
        this.spawnTimer = 0;
        this.minSpawnInterval = 1.0;
        this.maxSpawnInterval = 2.2;
        this.timeToNextSpawn = this._getRandomSpawnTime();
    }

    _getRandomSpawnTime() {
        return rand(this.minSpawnInterval, this.maxSpawnInterval);
    }

    getObstacleFromPool() {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isActive) {
                return this.pool[i];
            }
        }
        return null;
    }

    spawnObstacleIfNeeded(dt, gameWidth) { // Removed heroSpeed, not needed for spawning decision
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.timeToNextSpawn) {
            this.spawnTimer = 0;
            this.timeToNextSpawn = this._getRandomSpawnTime();
            const obstacle = this.getObstacleFromPool();
            if (obstacle) {
                const typeKeys = Object.keys(OBSTACLE_TYPES);
                const randomType = typeKeys[Math.floor(rand(0, typeKeys.length))];
                obstacle.init(randomType, gameWidth, 0, this.gameHeight);
                return obstacle;
            }
        }
        return null;
    }

    updateActiveObstacles(dt, heroSpeed) {
        for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
            const obstacle = this.activeObstacles[i];
            obstacle.update(dt, heroSpeed);
            if (obstacle.x + obstacle.width < 0) {
                obstacle.reset();
                this.activeObstacles.splice(i, 1);
            }
        }
    }
}

/**
 * Checks for AABB collision between two rectangles.
 * @param {object} rectA - { x, y, width, height }
 * @param {object} rectB - { x, y, width, height }
 * @returns {boolean} True if collision, false otherwise.
 */
export function checkAABBCollision(rectA, rectB) {
    return rectA.x < rectB.x + rectB.width &&
           rectA.x + rectA.width > rectB.x &&
           rectA.y < rectB.y + rectB.height &&
           rectA.y + rectA.height > rectB.y;
}

export function checkPlayerObstacleCollisions(player, activeObstacles) {
    const playerHitbox = {
        x: player.x + player.width * (1 - HITBOX_SCALE_FACTOR) / 2,
        y: player.y + player.height * (1 - HITBOX_SCALE_FACTOR) / 2,
        width: player.width * HITBOX_SCALE_FACTOR,
        height: player.height * HITBOX_SCALE_FACTOR
    };

    for (const obstacle of activeObstacles) {
        if (obstacle.isActive) {
            const obstacleHitbox = obstacle.getHitbox();
            if (checkAABBCollision(playerHitbox, obstacleHitbox)) {
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}
