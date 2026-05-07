/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import paper from '@scratch/paper';

import {stripInvalidPaperData} from '../../src/helper/strip-invalid-paper-data';

/**
 * Walk a paper item and produce a normalized structural snapshot mirroring
 * the fields the editor's selection and grouping tools care about:
 *
 *     {className, name, dataId?, children?}
 *
 * `dataId` is included only when the underlying paper item has `data.id`
 * set. `children` is included only when paper carries a children array
 * (containers like Group, Layer, CompoundPath; leaves like Path return
 * `null` at runtime). Excludes paper's internal `_id` (regenerates on
 * every import) and exact geometry / style (covered by the visual-fidelity
 * test in scratch-svg-renderer).
 *
 * Note on identifiers: paper.project.importSVG drops SVG `id` attributes
 * by default. Verified against the cat costume; both `name` and `data.id`
 * come back null even though the source SVG has multiple `<g id="...">`
 * groups. scratch-paint's selection/grouping helpers don't depend on those
 * SVG ids either — they work off in-memory paper references.
 *
 * @param {paper.Item} item - paper item to snapshot.
 * @returns {object} normalized structural snapshot.
 */
const sceneGraph = item => {
    const snap = {
        className: item.className,
        name: item.name
    };
    if (item.data && item.data.id) {
        snap.dataId = item.data.id;
    }
    if (Array.isArray(item.children)) {
        snap.children = item.children.map(sceneGraph);
    }
    return snap;
};

/**
 * Snapshot a paper project. paper's `Project` has only `layers` —
 * no `className`, `name`, or `data` — so the snapshot mirrors that shape
 * rather than pretending to be item-shaped.
 * @param {paper.Project} project - paper project to snapshot.
 * @returns {{layers: object[]}} project structural snapshot.
 */
const projectSceneGraph = project => ({
    layers: (project.layers || []).map(sceneGraph)
});

/**
 * Round-trip an SVG through paper.project's JSON serialization:
 *   importSVG(svg) -> exportJSON() -> fresh project -> importJSON()
 * @param {string} svgString - SVG markup to import.
 * @returns {{before: object, after: object}} project snapshots before and
 *   after the round-trip.
 */
const roundTripSceneGraphs = svgString => {
    const canvasBefore = document.createElement('canvas');
    paper.setup(canvasBefore);
    const importedBefore = paper.project.importSVG(svgString, {expandShapes: true});
    expect(importedBefore).toBeTruthy();
    const before = projectSceneGraph(paper.project);
    const json = paper.project.exportJSON();
    paper.project.remove();

    const canvasAfter = document.createElement('canvas');
    paper.setup(canvasAfter);
    paper.project.importJSON(json);
    const after = projectSceneGraph(paper.project);
    paper.project.remove();

    return {before, after};
};

/**
 * Count items of every className across a list of item snapshots,
 * recursively. Used as a trivially-passing-test guard: an empty count
 * would suggest importSVG never ran or the walk is wrong.
 * @param {object[]} items - top-level item snapshots from sceneGraph().
 * @returns {object} map of className -> count.
 */
const tallyItemKinds = items => {
    const counts = {};
    const walk = node => {
        counts[node.className] = (counts[node.className] || 0) + 1;
        if (Array.isArray(node.children)) {
            node.children.forEach(walk);
        }
    };
    items.forEach(walk);
    return counts;
};

describe('Paper.js JSON round-trip preserves editor-relevant scene-graph (Phase 0 task 1a)', () => {
    // Paper's project state lives on the imported `paper` module. If a test
    // fails partway through and a paper.project.remove() never runs, the
    // leftover project leaks into the next test in the same Jest worker.
    // Drain everything between tests so each one starts clean.
    afterEach(() => {
        while (paper.projects.length > 0) {
            paper.projects[paper.projects.length - 1].remove();
        }
    });

    test('cat costume: scene-graph snapshot is identical before and after exportJSON / importJSON', () => {
        const svgPath = path.resolve(__dirname, '..', 'fixtures', 'cat-costume.svg');
        const svgString = fs.readFileSync(svgPath, 'utf8');

        const {before, after} = roundTripSceneGraphs(svgString);

        // Guard against a trivially-passing test: the cat costume has
        // multiple groups and a bunch of paths.
        const beforeKinds = tallyItemKinds(before.layers);
        expect(beforeKinds.Path).toBeGreaterThan(0);
        expect(beforeKinds.Group).toBeGreaterThan(0);

        // Deep equality covers item count, hierarchy, kind, and any name /
        // dataId that paper does happen to carry through.
        expect(after).toEqual(before);
    });

    test('invalid-paper-data fixture: bad data-paper-data is stripped, valid content survives round-trip', () => {
        // The fixture has data-paper-data="not valid json" on the <svg>
        // root and a valid data-paper-data on a <g> wrapping a <circle>.
        // Without the strip, paper.project.importSVG synchronously throws
        // on the bad attribute and the import never reaches the circle.
        const svgPath = path.resolve(__dirname, '..', 'fixtures', 'invalid-paper-data.svg');
        const raw = fs.readFileSync(svgPath, 'utf8');
        const doc = new DOMParser().parseFromString(raw, 'text/xml');
        expect(doc.documentElement.getAttribute('data-paper-data')).toBe('not valid json');

        expect(stripInvalidPaperData(doc)).toBe(true);

        // Bad attribute on the root is gone; valid sibling on <g> remains.
        expect(doc.documentElement.hasAttribute('data-paper-data')).toBe(false);
        const g = doc.querySelector('g');
        expect(g).not.toBeNull();
        expect(JSON.parse(g.getAttribute('data-paper-data'))).toEqual({isPaintingLayer: false});

        // Circle still present in the markup paper will receive.
        expect(doc.querySelector('circle')).not.toBeNull();

        const stripped = new XMLSerializer().serializeToString(doc);
        const {before, after} = roundTripSceneGraphs(stripped);

        // <circle> with expandShapes: true becomes a Path. If paper had
        // thrown on the bad attribute, no Path would be present here.
        const beforeKinds = tallyItemKinds(before.layers);
        expect(beforeKinds.Path).toBeGreaterThan(0);

        expect(after).toEqual(before);
    });
});
