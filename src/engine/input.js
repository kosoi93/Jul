// Stage 7: Adaptive Input (Keyboard & Touch)

const SWIPE_THRESHOLD = 50; // Minimum pixels for a swipe to be registered
const SWIPE_TIME_LIMIT = 500; // ms, max time for a swipe

export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas; // Not strictly needed for global listeners but good for context

        this.jumpPressed = false;
        this.slideActive = false; // Slide is a state, true while key/swipe is active

        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;

        // Bind methods to ensure 'this' context is correct in event handlers
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        // this._handleTouchMove = this._handleTouchMove.bind(this); // If needed later
    }

    init() {
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);

        this.canvas.addEventListener('touchstart', this._handleTouchStart, { passive: false });
        // this.canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._handleTouchEnd);

        console.log("InputHandler Initialized");
    }

    _handleKeyDown(event) {
        if (event.code === 'Space' || event.code === 'ArrowUp') {
            event.preventDefault(); // Prevent page scrolling
            this.jumpPressed = true; // This will be consumed by the game update loop
        } else if (event.code === 'ArrowDown') {
            event.preventDefault();
            this.slideActive = true;
        }
    }

    _handleKeyUp(event) {
        if (event.code === 'ArrowDown') {
            this.slideActive = false;
        }
        // jumpPressed is an event, consumed and reset in game logic, not on keyup typically
    }

    _handleTouchStart(event) {
        event.preventDefault(); // Prevent page scrolling/zooming on canvas
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
        this.touchStartTime = performance.now();
    }

    // _handleTouchMove(event) {
    //     event.preventDefault(); // Prevent scrolling during swipe detection
    // }

    _handleTouchEnd(event) {
        event.preventDefault();
        if (!this.touchStartX || !this.touchStartY || !this.touchStartTime) return;

        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        const touchEndTime = performance.now();

        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        const deltaTime = touchEndTime - this.touchStartTime;

        if (deltaTime > SWIPE_TIME_LIMIT) {
            this.resetTouchState();
            return; // Swipe too slow
        }

        // Check for vertical swipe
        if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) { // Emphasize verticality
            if (deltaY < 0) { // Swipe Up
                this.jumpPressed = true;
                console.log("Swipe Up (Jump)");
            } else { // Swipe Down
                this.slideActive = true; // Set slideActive, game logic will handle duration or state
                // To make it behave like keydown (active while pressed), you might need a timer or different logic for touch slide
                // For now, let it be set to true, game logic can reset it or it auto-resets if it's a timed action.
                // Let's make touch slide a momentary action for now, similar to jump.
                // To make it a state: a flag that is reset by another event or timer.
                // For simplicity now, let's make it a toggle for the duration of the slide.
                // Game logic will need to manage how long slideActive stays true after a swipe.
                // For this stage, we'll treat it as a momentary trigger.
                // A better approach for touch slide might be a "slide button" or a hold gesture.
                // For now, a quick swipe down will set slideActive=true, keyup equivalent will reset it.
                // This means touch slide won't be "held". We can refine this if needed.
                // Let's assume for now slide is active as long as ArrowDown is pressed.
                // For touch, this means slideActive becomes true, and needs a mechanism to become false.
                // For now, we'll just set it to true, and game logic will need to handle it.
                // A common pattern is that slide lasts for a fixed duration or until jump.
                console.log("Swipe Down (Slide)");
            }
        }
        this.resetTouchState();
    }

    resetTouchState() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
    }

    // Call this after processing the jump input in the game loop
    consumeJump() {
        this.jumpPressed = false;
    }

    // For touch slide, if it's not a held state, it might need to be consumed too.
    // Or, the game logic handles the duration of the slide.
    // For now, slideActive will be reset by keyup for keyboard.
    // For touch, if it's a "start slide" event, game logic controls slide duration.

    destroy() {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        this.canvas.removeEventListener('touchstart', this._handleTouchStart);
        // this.canvas.removeEventListener('touchmove', this._handleTouchMove);
        this.canvas.removeEventListener('touchend', this._handleTouchEnd);
        console.log("InputHandler Destroyed");
    }
}
