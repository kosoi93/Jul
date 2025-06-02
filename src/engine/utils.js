// Stage 4: Sprite Animation Utilities (content from previous stage)
// ... (SpriteAnimation class)

export class SpriteAnimation {
    constructor(spriteSheetUrl, frameWidth, frameHeight, frameCount, frameDurationPerFrame, loop = true) {
        this.spriteSheetUrl = spriteSheetUrl;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount; // Total frames in this animation sequence
        this.frameDuration = frameDurationPerFrame; // Duration each frame is shown (in seconds)
        this.loop = loop;

        this.image = new Image();
        this.isLoaded = false;
        this.currentFrameIndex = 0;
        this.elapsedTime = 0; // Time accumulated for the current frame

        this.image.onload = () => {
            this.isLoaded = true;
            console.log(`Sprite sheet loaded: ${this.spriteSheetUrl}`);
        };
        this.image.onerror = () => {
            console.error(`Failed to load sprite sheet: ${this.spriteSheetUrl}`);
        };
        this.image.src = this.spriteSheetUrl;
    }

    update(dt) {
        if (!this.isLoaded) return;

        this.elapsedTime += dt;

        if (this.elapsedTime >= this.frameDuration) {
            this.elapsedTime -= this.frameDuration; // or this.elapsedTime = 0 if precision matters less
            this.currentFrameIndex++;

            if (this.currentFrameIndex >= this.frameCount) {
                if (this.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = this.frameCount - 1; // Stay on last frame
                }
            }
        }
    }

    /**
     * Draws the current frame of the animation.
     * @param {CanvasRenderingContext2D} ctx The rendering context.
     * @param {number} x The destination x-coordinate on the canvas.
     * @param {number} y The destination y-coordinate on the canvas.
     * @param {number} [dWidth=this.frameWidth] Destination width.
     * @param {number} [dHeight=this.frameHeight] Destination height.
     */
    draw(ctx, x, y, dWidth, dHeight) {
        if (!this.isLoaded) {
            // Optionally draw a placeholder if not loaded
            // ctx.fillStyle = 'grey';
            // ctx.fillRect(x, y, dWidth || this.frameWidth, dHeight || this.frameHeight);
            return;
        }

        const sx = this.currentFrameIndex * this.frameWidth;
        const sy = 0; // Assuming all frames are in a single horizontal row in the sprite sheet

        ctx.drawImage(
            this.image,
            sx, sy, this.frameWidth, this.frameHeight, // Source rectangle
            x, y, dWidth || this.frameWidth, dHeight || this.frameHeight   // Destination rectangle
        );
    }
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function rand(min, max) { // Ensure this is exported
    return Math.random() * (max - min) + min;
}
