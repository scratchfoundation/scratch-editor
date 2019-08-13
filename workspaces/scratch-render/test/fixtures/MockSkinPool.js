const Skin = require('../../src/Skin');

class MockSkinPool {
    constructor () {
        this._allDrawables = [];
    }

    static forDrawableSkin (drawable) {
        const pool = new MockSkinPool();
        pool.addDrawable(drawable);
        pool.addSkin(drawable.skin);
        return pool;
    }

    _skinWasAltered (skin) {
        for (let i = 0; i < this._allDrawables.length; i++) {
            const drawable = this._allDrawables[i];
            if (drawable && drawable._skin === skin) {
                drawable._skinWasAltered();
            }
        }
    }

    addDrawable (drawable) {
        this._allDrawables.push(drawable);
        return drawable;
    }

    addSkin (skin) {
        skin.addListener(Skin.Events.WasAltered, this._skinWasAltered.bind(this, skin));
        return skin;
    }
}

module.exports = MockSkinPool;
