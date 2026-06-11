/* eslint-env jest */
/**
 * Regression coverage for the SVG sanitization step that paper-canvas.jsx's
 * `importSvg` runs before `paper.project.importSVG`. Paper.js's import path
 * appends parsed SVG nodes into the document during processing, which fires
 * execution paths on `<foreignObject>`, event-handler attributes, and
 * similar features. `sanitizeSvg.sanitizeSvgText` uses DOMPurify's SVG
 * profile, which strips those shapes.
 *
 * Two layers of coverage: sanitizer-level assertions on hostile and
 * legitimate inputs, plus an integration assertion that `importSvg`
 * actually routes its input through the sanitizer before handing it to
 * paper.
 */

import paper from '@scratch/paper';
import {sanitizeSvg} from '@scratch/scratch-svg-renderer';

import PaperCanvasConnected from '../../src/containers/paper-canvas';

const PaperCanvas = PaperCanvasConnected.WrappedComponent;

const wrap = body =>
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">${body}</svg>`;

describe('sanitizeSvgText strips dangerous SVG shapes', () => {
    test('removes <foreignObject> with <img onerror>', () => {
        const hostile = wrap(
            '<foreignObject width="10" height="10">' +
            '<img src="data:image/png;base64,nope" onerror="alert(\'xss\')"/>' +
            '</foreignObject>' +
            '<circle r="5"/>'
        );
        const sanitized = sanitizeSvg.sanitizeSvgText(hostile);
        expect(sanitized).not.toMatch(/<foreignObject/i);
        expect(sanitized).not.toMatch(/onerror/i);
        expect(sanitized).not.toMatch(/<img/i);
    });

    test('removes event-handler attributes on the <svg> root', () => {
        const hostile =
            '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" viewBox="0 0 10 10">' +
            '<circle r="5"/>' +
            '</svg>';
        const sanitized = sanitizeSvg.sanitizeSvgText(hostile);
        expect(sanitized).not.toMatch(/onload/i);
    });

    test('removes event-handler attributes on a child element', () => {
        const sanitized = sanitizeSvg.sanitizeSvgText(
            wrap('<rect width="10" height="10" onclick="alert(1)"/>')
        );
        expect(sanitized).not.toMatch(/onclick/i);
    });

    test('removes <script> elements', () => {
        const sanitized = sanitizeSvg.sanitizeSvgText(
            wrap('<script>alert(1)</script><circle r="5"/>')
        );
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/alert\(/);
    });

    test('preserves legitimate shape content', () => {
        // Smoke check: a plain costume body should survive sanitization
        // intact enough to render — not stripped to an empty <svg>. Assert
        // through a parsed DOM so attribute serialization changes in the
        // sanitizer (quoting, whitespace, attribute order) don't make this
        // test flaky.
        const sanitized = sanitizeSvg.sanitizeSvgText(
            wrap('<g id="costume"><circle cx="50" cy="50" r="20" fill="red"/></g>')
        );
        const doc = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
        const circle = doc.querySelector('circle');
        expect(circle).not.toBeNull();
        expect(circle.getAttribute('r')).toBe('20');
        expect(circle.getAttribute('fill')).toBe('red');
        expect(circle.getAttribute('cx')).toBe('50');
        expect(circle.getAttribute('cy')).toBe('50');
    });
});

describe('PaperCanvas.importSvg routes input through sanitizeSvgText', () => {
    let importSpy;
    let sanitizeSpy;

    beforeEach(() => {
        const canvas = document.createElement('canvas');
        paper.setup(canvas);
        // Mock paper.project.importSVG to a no-op so we don't have to
        // satisfy the rest of importSvg's onLoad chain — the assertion is
        // about what gets handed to paper, not what paper does with it.
        importSpy = jest.spyOn(paper.project, 'importSVG').mockImplementation(() => {});
        sanitizeSpy = jest.spyOn(sanitizeSvg, 'sanitizeSvgText');
    });

    afterEach(() => {
        importSpy.mockRestore();
        sanitizeSpy.mockRestore();
        while (paper.projects.length > 0) {
            paper.projects[paper.projects.length - 1].remove();
        }
    });

    test('paper.project.importSVG receives input that has been through sanitizeSvgText', () => {
        // importSvg accesses this.props.changeFormat / undoSnapshot only on
        // the SVG-import-failed branch, and this.recalibrateSize only when
        // the (mocked-out) onLoad fires. A minimal fakeThis with jest.fn()
        // stand-ins is enough to call through.
        const fakeThis = {
            props: {changeFormat: jest.fn(), undoSnapshot: jest.fn()},
            recalibrateSize: jest.fn()
        };
        const hostile =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
            '<foreignObject width="10" height="10">' +
            '<img src="data:image/png;base64,nope" onerror="alert(\'xss\')"/>' +
            '</foreignObject>' +
            '<rect width="5" height="5" onclick="alert(1)"/>' +
            '</svg>';

        PaperCanvas.prototype.importSvg.call(fakeThis, hostile, 0, 0);

        expect(sanitizeSpy).toHaveBeenCalledTimes(1);
        expect(importSpy).toHaveBeenCalledTimes(1);
        const svgPassedToPaper = importSpy.mock.calls[0][0];
        expect(svgPassedToPaper).not.toMatch(/<foreignObject/i);
        expect(svgPassedToPaper).not.toMatch(/onerror/i);
        expect(svgPassedToPaper).not.toMatch(/onclick/i);
        expect(svgPassedToPaper).not.toMatch(/<img/i);
    });
});
