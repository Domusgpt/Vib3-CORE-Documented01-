import { describe, expect, it } from 'vitest';
import { EXPORT_FORMATS } from '../../tools/export/formats.js';

describe('export formats', () => {
    it('matches the export format snapshot', () => {
        expect(EXPORT_FORMATS).toMatchSnapshot();
    });
});
