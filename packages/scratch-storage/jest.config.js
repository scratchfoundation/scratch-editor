module.exports = {
    transform: {
        '\\.(png|svg|wav)$': '<rootDir>/test/transformers/arraybuffer-loader.js'
    }
};
