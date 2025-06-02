// Stage 10/Current: AudioManager with OGG/MP3 fallback
import { track } from './utils.js'; // For logging audio errors, as per user suggestion

const SFX_ASSET_PATH = 'assets/audio/'; // Assuming SFX and Music are in the same audio subfolder
const MUSIC_ASSET_PATH = 'assets/audio/';

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sfxBuffers = new Map();
        this.musicBuffers = new Map();
        this.currentMusicSource = null;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.5; // Default music volume
        this.isMuted = false; // General mute state

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext) {
                console.log("AudioContext initialized successfully.");
            }
        } catch (e) {
            console.warn("Web Audio API is not supported by this browser.", e);
            track('audio_error', { type: 'init_failed', message: e.message });
        }
    }

    // Generic sound loader with OGG/MP3 fallback
    async _loadSound(baseName, pathPrefix = SFX_ASSET_PATH) {
        if (!this.audioContext) return Promise.reject("AudioContext not available.");

        const tryFormat = async (ext) => {
            const fullPath = `${pathPrefix}${baseName}.${ext}`;
            // console.log(`Attempting to load: ${fullPath}`);
            const response = await fetch(fullPath);
            if (!response.ok) {
                // console.warn(`Failed to fetch ${fullPath}: ${response.statusText}`);
                return Promise.reject(`Failed to fetch ${ext}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return this.audioContext.decodeAudioData(arrayBuffer);
        };

        try {
            // Try OGG first
            if (this.audioContext.canPlayType && this.audioContext.canPlayType('audio/ogg; codecs="vorbis"')) {
                 // console.log(`Attempting OGG for ${baseName}`);
                return await tryFormat('ogg');
            }
             // console.log(`OGG not supported or initial try failed for ${baseName}, trying MP3.`);
            return await tryFormat('mp3'); // Fallback to MP3
        } catch (oggError) {
            // console.warn(`OGG loading failed for ${baseName}: ${oggError}. Trying MP3.`);
            try {
                return await tryFormat('mp3');
            } catch (mp3Error) {
                console.error(`Failed to load sound ${baseName} in both OGG and MP3 formats. OGG: ${oggError}, MP3: ${mp3Error}`);
                track('audio_error', { name: baseName, type: 'load_failed', oggError: String(oggError), mp3Error: String(mp3Error) });
                return Promise.reject(`Failed to load ${baseName}`);
            }
        }
    }

    async loadSFX(name) {
        if (this.sfxBuffers.has(name)) {
            return this.sfxBuffers.get(name);
        }
        try {
            const buffer = await this._loadSound(name, SFX_ASSET_PATH);
            this.sfxBuffers.set(name, buffer);
            // console.log(`SFX loaded and cached: ${name}`);
            return buffer;
        } catch (error) {
            // Error already logged in _loadSound
            return null;
        }
    }

    async loadMusic(name) {
        if (this.musicBuffers.has(name)) {
            return this.musicBuffers.get(name);
        }
        try {
            const buffer = await this._loadSound(name, MUSIC_ASSET_PATH);
            this.musicBuffers.set(name, buffer);
            // console.log(`Music loaded and cached: ${name}`);
            return buffer;
        } catch (error) {
            // Error already logged in _loadSound
            return null;
        }
    }

    _playBuffer(buffer, loop = false, volume = 1, onEndedCallback = null) {
        if (!this.audioContext || !buffer || this.isMuted) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.loop = loop;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(0);
        if (onEndedCallback) {
            source.onended = onEndedCallback;
        }
        return source;
    }

    async playSFX(name, volume = this.sfxVolume) {
        if (this.isMuted) return;
        try {
            let buffer = this.sfxBuffers.get(name);
            if (!buffer) {
                // console.log(`SFX ${name} not preloaded, loading now...`);
                buffer = await this.loadSFX(name);
            }
            if (buffer) {
                this._playBuffer(buffer, false, volume);
            }
        } catch (error) {
            // Error should have been logged during loadSFX if it failed there
            console.warn(`Could not play SFX ${name}:`, error);
        }
    }

    async playMusic(name, loop = true, volume = this.musicVolume) {
        if (this.isMuted && name !== null) return; // Allow stopping music even if muted

        if (this.currentMusicSource) {
            try {
                this.currentMusicSource.onended = null; // Remove previous onended if any
                this.currentMusicSource.stop();
            } catch (e) { /* ignore if already stopped */ }
            this.currentMusicSource = null;
        }

        if (name === null) return; // Explicitly stop music if name is null

        try {
            let buffer = this.musicBuffers.get(name);
            if (!buffer) {
                // console.log(`Music ${name} not preloaded, loading now...`);
                buffer = await this.loadMusic(name);
            }
            if (buffer) {
                this.currentMusicSource = this._playBuffer(buffer, loop, volume, () => {
                    // This onended callback is mostly for non-looping music or specific logic
                    if (!loop) this.currentMusicSource = null;
                });
            }
        } catch (error) {
            console.warn(`Could not play music ${name}:`, error);
        }
    }

    stopMusic() {
        if (this.currentMusicSource) {
             try {
                this.currentMusicSource.onended = null;
                this.currentMusicSource.stop();
            } catch (e) { /* ignore */ }
            this.currentMusicSource = null;
            // console.log("Music stopped.");
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        // TODO: If music is playing, adjust its gainNode. This needs gainNode to be stored.
        // For now, it affects next played music.
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        // console.log(`Audio Muted: ${this.isMuted}`);
        if (this.isMuted && this.currentMusicSource) {
            this.currentMusicSource.stop(); // Stop music when muted
            // Note: A more advanced mute would use a global gain node for the entire context
        } else if (!this.isMuted && this.currentMusicSource && this.currentMusicSource.buffer) {
            // This would require re-playing the music.
            // Or, if we had a global gain node, we'd just set its value.
            // For now, music stops on mute and doesn't auto-resume.
        }
        return this.isMuted;
    }

    // Call this on first user interaction if AudioContext needs resume
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully.");
            }).catch(e => {
                console.error("Error resuming AudioContext:", e);
                track('audio_error', { type: 'resume_failed', message: e.message });
            });
        }
    }
}
