module.exports = {
    process (_sourceText, sourcePath) {
        return {
            code: [
                'const fs = require("fs");',
                `module.exports = fs.readFileSync('${sourcePath}');`
            ].join('\n')
        };
    }
};
