/**
 * ParameterTimeline Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ParameterTimeline } from '../../src/creative/ParameterTimeline.js';

describe('ParameterTimeline', () => {
    let timeline;
    let updateFn;

    beforeEach(() => {
        vi.useFakeTimers();
        updateFn = vi.fn();
        timeline = new ParameterTimeline(updateFn);
    });

    afterEach(() => {
        if (timeline) timeline.dispose();
        vi.useRealTimers();
    });

    describe('track management', () => {
        it('adds a track', () => {
            expect(timeline.addTrack('hue')).toBe(true);
            expect(timeline.getTrackNames()).toContain('hue');
        });

        it('prevents duplicate tracks', () => {
            timeline.addTrack('hue');
            expect(timeline.addTrack('hue')).toBe(false);
        });

        it('removes a track', () => {
            timeline.addTrack('hue');
            expect(timeline.removeTrack('hue')).toBe(true);
            expect(timeline.getTrackNames()).not.toContain('hue');
        });

        it('returns false when removing nonexistent track', () => {
            expect(timeline.removeTrack('nonexistent')).toBe(false);
        });
    });

    describe('keyframes', () => {
        beforeEach(() => {
            timeline.addTrack('hue');
        });

        it('adds a keyframe', () => {
            const index = timeline.addKeyframe('hue', 0, 100);
            expect(index).toBeGreaterThanOrEqual(0);
            const kfs = timeline.getTrackKeyframes('hue');
            expect(kfs.length).toBe(1);
            expect(kfs[0].value).toBe(100);
        });

        it('adds multiple keyframes', () => {
            timeline.addKeyframe('hue', 0, 0);
            timeline.addKeyframe('hue', 500, 180);
            timeline.addKeyframe('hue', 1000, 360);
            expect(timeline.getTrackKeyframes('hue').length).toBe(3);
        });

        it('updates a keyframe', () => {
            const idx = timeline.addKeyframe('hue', 0, 100);
            timeline.updateKeyframe('hue', idx, { value: 200 });
            const kfs = timeline.getTrackKeyframes('hue');
            expect(kfs[0].value).toBe(200);
        });

        it('removes a keyframe', () => {
            timeline.addKeyframe('hue', 0, 100);
            expect(timeline.removeKeyframe('hue', 0)).toBe(true);
            expect(timeline.getTrackKeyframes('hue').length).toBe(0);
        });

        it('clears all keyframes on a track', () => {
            timeline.addKeyframe('hue', 0, 0);
            timeline.addKeyframe('hue', 500, 180);
            timeline.clearTrack('hue');
            expect(timeline.getTrackKeyframes('hue').length).toBe(0);
        });

        it('returns null for nonexistent track keyframes', () => {
            expect(timeline.getTrackKeyframes('nonexistent')).toBeNull();
        });
    });

    describe('playback', () => {
        it('starts not playing', () => {
            expect(timeline.playing).toBe(false);
        });

        it('plays and pauses', () => {
            timeline.play();
            expect(timeline.playing).toBe(true);
            timeline.pause();
            expect(timeline.playing).toBe(false);
        });

        it('stops and resets time', () => {
            timeline.play();
            timeline.stop();
            expect(timeline.playing).toBe(false);
            expect(timeline.currentTime).toBe(0);
        });

        it('sets duration', () => {
            timeline.setDuration(5000);
            expect(timeline.duration).toBe(5000);
        });

        it('sets loop mode', () => {
            timeline.setLoopMode('bounce');
            expect(timeline.loopMode).toBe('bounce');
        });

        it('sets playback speed', () => {
            timeline.setSpeed(2.0);
            expect(timeline.playbackSpeed).toBe(2.0);
        });
    });

    describe('serialization', () => {
        it('exports state', () => {
            timeline.addTrack('hue');
            timeline.addKeyframe('hue', 0, 100);
            const state = timeline.exportTimeline();
            expect(state).toHaveProperty('tracks');
            expect(state).toHaveProperty('duration');
            expect(state).toHaveProperty('loopMode');
        });

        it('imports state', () => {
            timeline.addTrack('hue');
            timeline.addKeyframe('hue', 0, 100);
            const state = timeline.exportTimeline();
            const newTimeline = new ParameterTimeline(updateFn);
            const result = newTimeline.importTimeline(state);
            expect(result).toBe(true);
            newTimeline.dispose();
        });
    });

    describe('dispose', () => {
        it('disposes without error', () => {
            expect(() => timeline.dispose()).not.toThrow();
        });
    });
});
