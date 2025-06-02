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

/**
 * Мини-аналитика: отправка событий через sendBeacon.
 * @param {string} event — код события (game_start, game_over, shard_pickup …)
 * @param {object} [data] — произвольный объект с дополнительными полями
 */
export function track(event, data = {}) {
  const url = 'https://analytics.example.com/neon-runner'; // TODO: заменить на реальный
  const payload = JSON.stringify({ event, data, t: Date.now() });

  // Не блокируем главный поток; sendBeacon есть не во всех браузерах
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, payload);
  } else {
    fetch(url, { method: 'POST', body: payload, keepalive: true })
      .catch(() => {/* молча игнорируем ошибки сети */});
  }
}

/**
 * Делится рекордом через Web Share API.
 * @param {number} score — лучший счёт
 * @param {HTMLCanvasElement} canvas — отрендеренный игровой канвас
 */
export async function shareScore(score, canvas) {
  if (!('share' in navigator) || !navigator.canShare) {
    alert('Ваш браузер не поддерживает системный диалог «Поделиться».');
    // Optionally, track this event if analytics for feature support is desired
    // track('share_api_not_supported');
    return;
  }

  return new Promise(resolve => {
    canvas.toBlob(async blob => {
      if (!blob) {
        // track('share_blob_creation_failed');
        alert('Не удалось создать скриншот для отправки.');
        resolve();
        return;
      }
      const file = new File([blob], 'neon-runner-score.png', { type: blob.type });
      const shareData = {
        text: `Мой рекорд в Neon Runner — ${score} очков! Сможешь лучше? #NeonRunner`,
        files: [file],
        title: 'Neon Runner Record!'
      };

      // Check if canShare with files, some browsers might support text but not files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share(shareData);
          track('share_success');
        } catch (err) {
          // Common errors: AbortError if user cancels, NotAllowedError etc.
          if (err.name !== 'AbortError') { // Don't track user cancellations as errors
            console.warn('Web Share API error:', err);
            track('share_error', { errorName: err.name, errorMessage: err.message });
          } else {
            track('share_cancel');
          }
        }
      } else {
        // Fallback if files cannot be shared, try sharing text only
        try {
          await navigator.share({ text: shareData.text, title: shareData.title });
          track('share_success_text_only');
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Web Share API (text only) error:', err);
            track('share_error_text_only', { errorName: err.name, errorMessage: err.message });
          } else {
            track('share_cancel');
          }
        }
      }
      resolve();
    }, 'image/png');
  });
}
