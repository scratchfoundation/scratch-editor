const Skin = require('../../src/Skin');

class MockSkin extends Skin {
    set size (dimensions) {
        this.dimensions = dimensions;
    }

    get size () {
        return this.dimensions || [0, 0];
    }

    set rotationCenter (center) {
        this._rotationCenter[0] = center[0];
        this._rotationCenter[1] = center[1];
        this.emit(Skin.Events.WasAltered);
    }

    get rotationCenter () {
        return this._rotationCenter;
    }
}

module.exports = MockSkin;
