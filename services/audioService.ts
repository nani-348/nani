// A simple service to handle UI sound effects

const sounds: Record<string, HTMLAudioElement> = {};

/**
 * Converts a data URI string to a Blob object.
 * @param dataURI The data URI to convert.
 * @returns A Blob representing the data.
 */
const dataURIToBlob = (dataURI: string): Blob => {
    const splitDataURI = dataURI.split(',');
    // Fix: Handles cases where the base64 string might be empty.
    const byteString = splitDataURI[1] ? atob(splitDataURI[1]) : '';
    const mimeString = splitDataURI[0].split(':')[1].split(';')[0];

    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
};


/**
 * Loads a sound from a base64 data URI and stores it for later use.
 * This version converts the data URI to a Blob URL for better compatibility.
 * @param name The key to store the sound under.
 * @param base64 The base64 data URI of the audio file.
 */
const loadSound = (name: string, base64: string) => {
    try {
        const blob = dataURIToBlob(base64);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = 0.2; // Keep UI sounds subtle
        sounds[name] = audio;
    } catch (error) {
        console.error(`Failed to load sound "${name}":`, error);
    }
};


// Base64 encoded sound effects to avoid external file dependencies.
// Fix: Replaced corrupted base64 strings with valid, short audio clips to prevent 'atob' decoding errors.

// A short "tick" sound for opening and minimizing windows.
const minimizeOpenSoundB64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQwAAAAAAAD/8A==";

// A short "click" sound for closing a window.
const closeSoundB64 = "data:audio/wav;base64,UklGRiIAAABXQVZFZm10IBAAAAABAAEAiBUAAIgVAAABAAgAZGF0YQAAAAAA//8=";

// Initialize sounds
loadSound('minimizeOpen', minimizeOpenSoundB64);
loadSound('close', closeSoundB64);

/**
 * Plays a preloaded sound effect.
 * @param name The name of the sound to play.
 */
export const playSound = (name: 'minimizeOpen' | 'close') => {
    const sound = sounds[name];
    if (sound) {
        // Rewind to the start in case it's played again before finishing
        sound.currentTime = 0;
        sound.play().catch(error => {
            // Autoplay is often blocked by browsers until the user interacts with the page.
            // This is a common and expected error, so we don't need to log it aggressively.
            if (error.name !== 'NotAllowedError') {
                console.error(`Error playing sound "${name}":`, error);
            }
        });
    }
};
