const fs = require('fs');

module.exports = {
    process (_sourceText, sourcePath) {
        const buffer = fs.readFileSync(sourcePath);
        const array = buffer.toJSON().data;
        return {
            code: `module.exports = Buffer.from([${array}]);`
        };
    }
};
