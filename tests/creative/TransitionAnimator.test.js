/**
 * TransitionAnimator Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TransitionAnimator } from '../../src/creative/TransitionAnimator.js';

describe('TransitionAnimator', () => {
    let animator;
    let updateFn;
    let getFn;

    beforeEach(() => {
        vi.useFakeTimers();
        updateFn = vi.fn();
        getFn = vi.fn().mockReturnValue(0);
        animator = new TransitionAnimator(updateFn, getFn);
    });

    afterEach(() => {
        if (animator) animator.dispose();
        vi.useRealTimers();
    });

    describe('constructor', () => {
        it('starts with no active transitions', () => {
            expect(animator.isAnimating()).toBe(false);
            expect(animator.getActiveCount()).toBe(0);
        });
    });

    describe('getEasingNames', () => {
        it('returns an array of easing function names', () => {
            const names = animator.getEasingNames();
            expect(Array.isArray(names)).toBe(true);
            expect(names.length).toBeGreaterThan(0);
            expect(names).toContain('linear');
            expect(names).toContain('easeInOut');
        });
    });

    describe('transition', () => {
        it('returns a transition ID', () => {
            const id = animator.transition({ hue: 180 }, 500);
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
        });

        it('marks as animating after starting', () => {
            animator.transition({ hue: 180 }, 500);
            expect(animator.isAnimating()).toBe(true);
        });
    });

    describe('cancel', () => {
        it('cancels a specific transition', () => {
            const id = animator.transition({ hue: 180 }, 5000);
            const cancelled = animator.cancel(id);
            expect(cancelled).toBe(true);
        });

        it('returns false for unknown ID', () => {
            expect(animator.cancel('nonexistent')).toBe(false);
        });
    });

    describe('cancelAll', () => {
        it('cancels all transitions', () => {
            animator.transition({ hue: 180 }, 5000);
            animator.transition({ speed: 2 }, 5000);
            animator.cancelAll();
            expect(animator.getActiveCount()).toBe(0);
        });
    });

    describe('dispose', () => {
        it('disposes and cancels all', () => {
            animator.transition({ hue: 180 }, 5000);
            animator.dispose();
            expect(animator.isAnimating()).toBe(false);
        });
    });
});
