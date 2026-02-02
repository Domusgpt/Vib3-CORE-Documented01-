/**
 * Framework Wrapper Tests (React, Vue, Svelte)
 *
 * These are static code generators — tests verify they produce valid source strings.
 */

import { describe, it, expect } from 'vitest';
import { Vib3ReactWrapper } from '../../src/integrations/frameworks/Vib3React.js';
import { Vib3VueWrapper } from '../../src/integrations/frameworks/Vib3Vue.js';
import { Vib3SvelteWrapper } from '../../src/integrations/frameworks/Vib3Svelte.js';

describe('Vib3ReactWrapper', () => {
    it('generates a React component string', () => {
        const component = Vib3ReactWrapper.getComponent();
        expect(typeof component).toBe('string');
        expect(component.length).toBeGreaterThan(100);
        expect(component).toContain('React');
    });

    it('generates a hook definition string', () => {
        const hook = Vib3ReactWrapper.getHookDefinition();
        expect(typeof hook).toBe('string');
        expect(hook.length).toBeGreaterThan(0);
    });

    it('generates a full package', () => {
        const pkg = Vib3ReactWrapper.generatePackage();
        expect(pkg).toBeTruthy();
        expect(typeof pkg).toBe('object');
    });

    it('has parameter definitions', () => {
        const defs = Vib3ReactWrapper.getParameterDefs();
        expect(defs).toBeTruthy();
    });
});

describe('Vib3VueWrapper', () => {
    it('generates a Vue component string', () => {
        const component = Vib3VueWrapper.getComponent();
        expect(typeof component).toBe('string');
        expect(component.length).toBeGreaterThan(100);
    });

    it('generates a composable string', () => {
        const composable = Vib3VueWrapper.getComposable();
        expect(typeof composable).toBe('string');
        expect(composable.length).toBeGreaterThan(0);
    });

    it('generates a full package', () => {
        const pkg = Vib3VueWrapper.generatePackage();
        expect(pkg).toBeTruthy();
        expect(typeof pkg).toBe('object');
    });

    it('has prop definitions', () => {
        const defs = Vib3VueWrapper.getPropDefs();
        expect(defs).toBeTruthy();
    });
});

describe('Vib3SvelteWrapper', () => {
    it('generates a Svelte component string', () => {
        const component = Vib3SvelteWrapper.getComponent();
        expect(typeof component).toBe('string');
        expect(component.length).toBeGreaterThan(100);
    });

    it('generates a store string', () => {
        const store = Vib3SvelteWrapper.getStore();
        expect(typeof store).toBe('string');
        expect(store.length).toBeGreaterThan(0);
    });

    it('generates a full package', () => {
        const pkg = Vib3SvelteWrapper.generatePackage();
        expect(pkg).toBeTruthy();
        expect(typeof pkg).toBe('object');
    });

    it('has prop definitions', () => {
        const defs = Vib3SvelteWrapper.getPropDefs();
        expect(defs).toBeTruthy();
    });
});
