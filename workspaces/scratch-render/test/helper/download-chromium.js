const packageJson = require('puppeteer-core/package.json');
const puppeteer = require('puppeteer-core');

const fetcher = puppeteer.createBrowserFetcher();
const revision = packageJson.puppeteer.chromium_revision;

/* eslint-disable no-console */
module.exports = async () => {
    const downloadedRevisions = await fetcher.localRevisions();
    if (downloadedRevisions.indexOf(revision) !== -1) {
        console.log('Chromium already downloaded');
        return Promise.resolve();
    }

    console.log('Downloading Chromium...');
    return fetcher.download(revision)
        .then(() => {
            console.log('Downloaded Chromium successfully');
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
};
