/**
 * Pretend paper.Item whose parent is a layer.
 * @param {object} options Item params
 * @param {string} options.strokeColor Value to return for the item's stroke color
 * @param {string} options.fillColor Value to return for the item's fill color
 * @param {string} options.strokeWidth Value to return for the item's stroke width
 * @returns {object} mock item
 */
const mockPaperRootItem = function (options) {
    return {
        strokeColor: {toCSS: function () {
            return options.strokeColor;
        }},
        fillColor: {toCSS: function () {
            return options.fillColor;
        }},
        strokeWidth: options.strokeWidth,
        parent: {className: 'Layer'},
        data: {}
    };
};

export {mockPaperRootItem};
