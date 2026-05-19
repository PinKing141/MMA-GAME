'use strict';

/**
 * Procedural audio engine for the fight broadcast.
 *
 * Every sound is synthesized via the Web Audio API — no asset files
 * needed. The engine exposes a small library of cues the rest of the
 * app can fire by name:
 *
 *  - bell()          Round bell (start/end of round)
 *  - hit('jab'|'cross'|'kick'|'body'|'block')
 *  - thud()          Heavy ground impact / knockdown
 *  - crowdMurmur()   Looping ambient crowd hum
 *  - crowdRoar()     One-shot crowd explosion (KO, sub finish)
 *  - crowdBoo()      One-shot disapproval (eye poke, foul)
 *  - walkoutDrums()  Looping walkout drum bed for entrances
 *  - ui('click'|'confirm'|'cancel')  Menu chrome
 *
 * A master gain controls overall volume and a few category buses
 * (sfx / crowd / music) let listeners mute selectively.
 */

const AudioEngine = (() => {
    let ctx = null;
    let master = null;
    let buses = {};
    const loops = {};

    let enabled = false;
    let volumes = {
        master: 0.65,
        sfx: 1.0,
        crowd: 0.55,
        music: 0.7,
        ui: 0.5
    };

    function ensureContext() {
        if (ctx) return ctx;
        if (typeof window === 'undefined') return null;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volumes.master;
        master.connect(ctx.destination);
        buses = {
            sfx: makeBus('sfx'),
            crowd: makeBus('crowd'),
            music: makeBus('music'),
            ui: makeBus('ui')
        };
        return ctx;
    }

    function makeBus(name) {
        const gain = ctx.createGain();
        gain.gain.value = volumes[name] ?? 0.8;
        gain.connect(master);
        return gain;
    }

    /**
     * Resume the audio context on a user gesture. Browsers require
     * this — autoplay policies block audio until the user interacts.
     */
    function unlock() {
        const c = ensureContext();
        if (!c) return;
        enabled = true;
        if (c.state === 'suspended') c.resume();
    }

    function setVolume(channel, value) {
        volumes[channel] = Math.max(0, Math.min(1, value));
        if (!ctx) return;
        if (channel === 'master' && master) {
            master.gain.value = volumes.master;
        } else if (buses[channel]) {
            buses[channel].gain.value = volumes[channel];
        }
    }

    function getVolumes() { return { ...volumes }; }

    /* ---------------------------------------------------------- */
    /* Primitive: a one-shot envelope on an oscillator             */
    /* ---------------------------------------------------------- */
    function blip({
        type = 'sine',
        freq = 440,
        freqEnd = null,
        duration = 0.2,
        attack = 0.005,
        bus = 'sfx',
        gain = 0.5,
        detune = 0
    }) {
        if (!enabled) return;
        const c = ensureContext();
        if (!c) return;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = detune;
        if (freqEnd !== null) {
            osc.frequency.exponentialRampToValueAtTime(
                Math.max(20, freqEnd),
                c.currentTime + duration
            );
        }
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
        osc.connect(g).connect(buses[bus] || buses.sfx);
        osc.start();
        osc.stop(c.currentTime + duration + 0.02);
    }

    /**
     * Filtered noise burst — the workhorse for impacts, crowd, snares.
     */
    function noiseBurst({
        duration = 0.15,
        bus = 'sfx',
        gain = 0.5,
        filter = 'lowpass',
        freq = 1200,
        q = 0.7,
        attack = 0.002
    }) {
        if (!enabled) return;
        const c = ensureContext();
        if (!c) return;
        const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const bp = c.createBiquadFilter();
        bp.type = filter;
        bp.frequency.value = freq;
        bp.Q.value = q;
        const g = c.createGain();
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
        source.connect(bp).connect(g).connect(buses[bus] || buses.sfx);
        source.start();
        source.stop(c.currentTime + duration + 0.02);
    }

    /* ---------------------------------------------------------- */
    /* Cue library                                                 */
    /* ---------------------------------------------------------- */
    function bell() {
        if (!enabled) return;
        // Two overlapping bell partials → metallic ring.
        blip({ type: 'triangle', freq: 880, freqEnd: 660, duration: 1.4, gain: 0.5, bus: 'sfx' });
        blip({ type: 'sine', freq: 1320, freqEnd: 990, duration: 1.4, gain: 0.32, bus: 'sfx', detune: 8 });
        blip({ type: 'sine', freq: 1760, freqEnd: 1320, duration: 0.9, gain: 0.18, bus: 'sfx', detune: -6 });
    }

    function hit(kind = 'jab') {
        if (!enabled) return;
        switch (kind) {
            case 'jab':
                noiseBurst({ duration: 0.08, freq: 2200, q: 0.8, gain: 0.4 });
                blip({ type: 'sine', freq: 380, freqEnd: 160, duration: 0.1, gain: 0.3 });
                break;
            case 'cross':
            case 'punch':
                noiseBurst({ duration: 0.12, freq: 1400, q: 1.1, gain: 0.55 });
                blip({ type: 'sine', freq: 220, freqEnd: 90, duration: 0.16, gain: 0.42 });
                break;
            case 'kick':
                noiseBurst({ duration: 0.18, freq: 600, q: 1.4, gain: 0.5 });
                blip({ type: 'sine', freq: 130, freqEnd: 60, duration: 0.22, gain: 0.55 });
                break;
            case 'body':
                noiseBurst({ duration: 0.14, freq: 350, q: 1.6, gain: 0.55 });
                blip({ type: 'sine', freq: 110, freqEnd: 55, duration: 0.18, gain: 0.5 });
                break;
            case 'block':
                noiseBurst({ duration: 0.06, freq: 3200, q: 0.9, gain: 0.3 });
                break;
            default:
                noiseBurst({ duration: 0.1, freq: 1200, q: 1.0, gain: 0.45 });
        }
    }

    function thud() {
        if (!enabled) return;
        // Body-on-canvas: low-freq noise sweep + sub thump.
        noiseBurst({ duration: 0.35, freq: 220, q: 0.9, gain: 0.6 });
        blip({ type: 'sine', freq: 90, freqEnd: 40, duration: 0.4, gain: 0.7 });
    }

    /* -------- Crowd ambience: continuous noise + filter wiggle --- */
    function crowdMurmur(playing = true) {
        if (!playing) {
            stopLoop('crowdMurmur');
            return;
        }
        if (!enabled) return;
        const c = ensureContext();
        if (!c || loops.crowdMurmur) return;

        const bufferSize = c.sampleRate * 2;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 480;
        filter.Q.value = 1.2;

        // Slow LFO on filter frequency to make the crowd "breathe".
        const lfo = c.createOscillator();
        const lfoGain = c.createGain();
        lfo.frequency.value = 0.18;
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain).connect(filter.frequency);

        const gain = c.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.5);

        source.connect(filter).connect(gain).connect(buses.crowd);
        source.start();
        lfo.start();

        loops.crowdMurmur = { source, gain, lfo };
    }

    function crowdRoar() {
        if (!enabled) return;
        const c = ensureContext();
        if (!c) return;
        // A roar: pink-ish noise burst with rising filter sweep.
        const bufferSize = c.sampleRate * 1.6;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(360, c.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2200, c.currentTime + 0.5);
        filter.Q.value = 0.6;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.85, c.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.5);
        source.connect(filter).connect(gain).connect(buses.crowd);
        source.start();
        source.stop(c.currentTime + 1.6);
    }

    function crowdBoo() {
        if (!enabled) return;
        // Boo = sustained low noise rumble.
        noiseBurst({ duration: 0.8, freq: 220, q: 0.5, gain: 0.55, bus: 'crowd' });
        blip({ type: 'sawtooth', freq: 130, freqEnd: 95, duration: 0.9, gain: 0.18, bus: 'crowd' });
    }

    /* -------- Walkout drums: looped kick+snare pattern ---------- */
    function walkoutDrums(playing = true) {
        if (!playing) {
            stopLoop('walkoutDrums');
            return;
        }
        if (!enabled) return;
        const c = ensureContext();
        if (!c || loops.walkoutDrums) return;

        const bpm = 92;
        const beatSec = 60 / bpm;
        let next = c.currentTime + 0.2;
        let beat = 0;

        const handle = { running: true };
        function scheduleNext() {
            if (!handle.running) return;
            // Schedule 4 beats ahead.
            while (next < c.currentTime + 0.5) {
                kick(next, 0.7);
                if (beat % 2 === 1) snare(next, 0.45);
                if (beat % 4 === 3) crashTom(next, 0.4);
                next += beatSec;
                beat += 1;
            }
            setTimeout(scheduleNext, 120);
        }
        scheduleNext();

        loops.walkoutDrums = handle;
    }

    function kick(time, gain = 0.7) {
        const c = ensureContext();
        if (!c) return;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
        osc.connect(g).connect(buses.music);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    function snare(time, gain = 0.4) {
        const c = ensureContext();
        if (!c) return;
        const bufferSize = Math.floor(c.sampleRate * 0.14);
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = c.createBufferSource();
        source.buffer = buffer;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1200;
        const g = c.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        source.connect(hp).connect(g).connect(buses.music);
        source.start(time);
        source.stop(time + 0.15);
    }

    function crashTom(time, gain = 0.4) {
        const c = ensureContext();
        if (!c) return;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.25);
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
        osc.connect(g).connect(buses.music);
        osc.start(time);
        osc.stop(time + 0.32);
    }

    function ui(kind = 'click') {
        if (!enabled) return;
        if (kind === 'click') {
            blip({ type: 'square', freq: 880, duration: 0.04, gain: 0.18, bus: 'ui' });
        } else if (kind === 'confirm') {
            blip({ type: 'sine', freq: 660, freqEnd: 990, duration: 0.18, gain: 0.25, bus: 'ui' });
        } else if (kind === 'cancel') {
            blip({ type: 'sawtooth', freq: 220, freqEnd: 140, duration: 0.18, gain: 0.2, bus: 'ui' });
        }
    }

    function stopLoop(name) {
        const handle = loops[name];
        if (!handle) return;
        if (handle.source) {
            try {
                if (handle.gain) {
                    handle.gain.gain.cancelScheduledValues(ctx.currentTime);
                    handle.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
                }
                handle.source.stop(ctx.currentTime + 0.7);
            } catch { /* ignore */ }
        }
        if (handle.lfo) {
            try { handle.lfo.stop(); } catch { /* ignore */ }
        }
        if (typeof handle === 'object' && 'running' in handle) {
            handle.running = false;
        }
        delete loops[name];
    }

    /* ---------- Public API ---------- */
    return {
        unlock,
        setVolume,
        getVolumes,
        bell,
        hit,
        thud,
        crowdMurmur,
        crowdRoar,
        crowdBoo,
        walkoutDrums,
        ui,
        isEnabled: () => enabled
    };
})();

if (typeof window !== 'undefined') {
    window.OctagonAudio = AudioEngine;
    // Auto-unlock on first interaction.
    const unlockOnce = () => {
        AudioEngine.unlock();
        window.removeEventListener('pointerdown', unlockOnce);
        window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce);
    window.addEventListener('keydown', unlockOnce);
}
