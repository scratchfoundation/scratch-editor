const Skin = require('../../src/Skin');

class MockSkin extends Skin {
    set size (dimensions) {
        this.dimensions = dimensions;
    }

    get size () {
        return this.dimensions || [0, 0];
    }
}

module.exports = MockSkin;
