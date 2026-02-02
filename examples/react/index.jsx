/**
 * VIB3+ React Example
 *
 * Run:
 *   npx create-vite my-vib3-app --template react
 *   cd my-vib3-app
 *   npm install @vib3code/sdk
 *   # Copy this file to src/App.jsx
 *   npm run dev
 */
import React, { useEffect, useRef, useState } from 'react';

// In a real project: import { VIB3Engine } from '@vib3code/sdk/core';
// For this example, we import from the local source:
import { VIB3Engine } from '../../src/core/VIB3Engine.js';

const SYSTEMS = ['quantum', 'faceted', 'holographic'];
const GEOMETRIES = Array.from({ length: 24 }, (_, i) => i);

export default function App() {
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const [system, setSystem] = useState('quantum');
    const [geometry, setGeometry] = useState(0);
    const [hue, setHue] = useState(200);

    useEffect(() => {
        const engine = new VIB3Engine();
        engineRef.current = engine;

        engine.initialize().then(() => {
            engine.switchSystem(system);
        });

        return () => {
            if (engine.destroy) engine.destroy();
        };
    }, []);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.switchSystem(system);
        }
    }, [system]);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setParameter('geometry', geometry);
        }
    }, [geometry]);

    useEffect(() => {
        if (engineRef.current) {
            engineRef.current.setParameter('hue', hue);
        }
    }, [hue]);

    return (
        <div style={{ background: '#07070f', minHeight: '100vh', color: '#ccc', fontFamily: 'monospace', padding: 24 }}>
            <h1 style={{ color: '#0fc', fontSize: 24 }}>VIB3+ React Example</h1>

            <div ref={containerRef} id="vib3-container" style={{ width: '100%', height: 480, background: '#111', borderRadius: 8, marginBottom: 24 }} />

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <label>
                    System:
                    <select value={system} onChange={e => setSystem(e.target.value)} style={{ marginLeft: 8 }}>
                        {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </label>

                <label>
                    Geometry ({geometry}):
                    <input type="range" min={0} max={23} value={geometry} onChange={e => setGeometry(+e.target.value)} />
                </label>

                <label>
                    Hue ({hue}):
                    <input type="range" min={0} max={360} value={hue} onChange={e => setHue(+e.target.value)} />
                </label>
            </div>
        </div>
    );
}
