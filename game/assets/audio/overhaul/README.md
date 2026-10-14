# Original soundscapes

Seven 32-second mono WAV loops, composed and synthesized locally by `tools/generate-soundscape.mjs`. No recordings, commercial melodies or third-party samples are used.

Title, tavern, Havenmere, wilderness, crypt, combat and boss scores combine modal plucked strings, low sustained tones, deep ceremonial drums, dry percussion and synthesized vowel-like choir textures. These are procedural soundscape drafts; they do not contain recorded female singers or a real monastic choir. A future recording pass can replace the WAVs while retaining `audio.js` playback and settings.

The mixer gates playback on a gesture, crossfades over 1.3 seconds, limits active tracks to two, and stores music/effects levels separately from adventure saves. Waves are validated for duration, audible energy and clipping. Music can be muted independently with the volume slider; the existing Sound control mutes both music and effects.
