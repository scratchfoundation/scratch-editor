// some server-side things don't fully fail until a 90-second timeout
// allow time for that so we get a more specific error message
jest.setTimeout(95000);

import {promises as fs} from 'fs';
import path from 'path';

import bindAll from 'lodash.bindall';
import webdriver from 'selenium-webdriver';

import packageJson from '../../package.json';

const {Button, By, until} = webdriver;

const USE_HEADLESS = process.env.USE_HEADLESS !== 'no';

// The main reason for this timeout is so that we can control the timeout message and report details;
// if we hit the Jasmine default timeout then we get a terse message that we can't control.
// The Jasmine default timeout is 30 seconds so make sure this is lower.
const DEFAULT_TIMEOUT_MILLISECONDS = 20 * 1000;

// There doesn't seem to be a way to ask Jest (or jest-junit) for its output directory. The idea here is that if we
// change the way we define the output directory in package.json, move it to a separate config file, etc.,
// a helpful error is better than a confusing error or silently dropping error output from CI.
const testResultsDir = packageJson.jest.reporters
    .map(r => r[1].outputDirectory)
    .filter(x => x)[0];
if (!testResultsDir) {
    throw new Error('Could not determine Jest test results directory');
}

/**
 * Recursively check if this error or any errors in its causal chain have been "enhanced" by `enhanceError`.
 * @param {Error} error The error to check.
 * @returns {boolean} True if the error or any of its causes have been enhanced.
 */
const isEnhancedError = error => {
    while (error) {
        if (error.scratchEnhancedError) {
            return true;
        }
        error = error.cause;
    }
    return false;
};

/**
 * Add more debug information to an error:
 * - Merge a causal error into an outer error with valuable stack information
 * - Add the causal error's message to the outer error's message.
 * - Add debug information from the web driver, if available.
 * The outerError compensates for the loss of context caused by `regenerator-runtime`.
 * @param {Error} outerError The error to embed the cause into.
 * @param {Error} cause The "inner" error to embed.
 * @param {webdriver.ThenableWebDriver} [driver] Optional driver to capture debug info from.
 * @returns {Promise<Error>} The outerError, with the cause embedded.
 */
const enhanceError = async (outerError, cause, driver) => {
    outerError.scratchEnhancedError = true;
    if (cause) {
        // This is the official way to nest errors in modern Node.js, but Jest ignores this field.
        // It's here in case a future version uses it, or in case the caller does.
        outerError.cause = cause;
    }
    if (cause && cause.message) {
        outerError.message += `\n${['Cause:', ...cause.message.split('\n')].join('\n    ')}`;
    } else {
        outerError.message += '\nCause: unknown';
    }
    // Don't make a second copy of this debug info if an inner error has already done it,
    // especially since retrieving the browser log is a destructive operation.
    if (driver && !isEnhancedError(cause)) {
        await fs.mkdir(testResultsDir, {recursive: true});
        const errorInfoDir = await fs.mkdtemp(`${testResultsDir}/selenium-error-`);
        outerError.message += `\nDebug info stored in: ${errorInfoDir}`;

        const pageInfoPath = path.join(errorInfoDir, 'info.json');
        await fs.writeFile(pageInfoPath, JSON.stringify({
            currentUrl: await driver.getCurrentUrl(),
            pageTitle: await driver.getTitle()
        }, null, 2));

        const pageSourcePath = path.join(errorInfoDir, 'page.html');
        await fs.writeFile(pageSourcePath, await driver.getPageSource());

        const browserLogPath = path.join(errorInfoDir, 'browser-log.txt');
        const browserLogEntries = await driver.manage()
            .logs()
            .get('browser');
        await fs.writeFile(browserLogPath, JSON.stringify(browserLogEntries, null, 2));
    }
    return outerError;
};

class SeleniumHelper {
    constructor () {
        bindAll(this, [
            'clickText',
            'clickButton',
            'clickXpath',
            'clickBlocksCategory',
            'elementIsVisible',
            'findByText',
            'textToXpath',
            'findByXpath',
            'textExists',
            'getDriver',
            'getSauceDriver',
            'getLogs',
            'loadUri',
            'rightClickText'
        ]);

        this.Key = webdriver.Key; // map Key constants, for sending special keys

        // this type declaration suppresses IDE type warnings throughout this file
        /** @type {webdriver.ThenableWebDriver} */
        this.driver = null;
    }

    /**
     * Set the browser window title. Useful for debugging.
     * @param {string} title The title to set.
     * @returns {Promise<void>} A promise that resolves when the title is set.
     */
    async setTitle (title) {
        await this.driver.executeScript(`document.title = arguments[0];`, title);
    }

    /**
     * Wait for an element to be visible.
     * @param {webdriver.WebElement} element The element to wait for.
     * @returns {Promise<void>} A promise that resolves when the element is visible.
     */
    async elementIsVisible (element) {
        const outerError = new Error('elementIsVisible failed');
        try {
            await this.setTitle(`elementIsVisible ${await element.getId()}`);
            await this.driver.wait(until.elementIsVisible(element), DEFAULT_TIMEOUT_MILLISECONDS);
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * List of useful xpath scopes for finding elements.
     * @returns {object} An object mapping names to xpath strings.
     * @note Do not check for an exact class name with `contains(@class, "foo")`: that will match `class="foo2"`.
     * Instead, use `contains(concat(" ", @class, " "), " foo ")`, which in this example will correctly report that
     * " foo2 " does not contain " foo ". Similarly, to check if an element has any class starting with "foo", use
     * `contains(concat(" ", @class), " foo")`. Checking with `starts-with(@class, "foo")`, for example, will only
     * work if the whole "class" attribute starts with "foo" -- it will fail if another class is listed first.
     */
    get scope () {
        return {
            blocksTab: "*[@id='panel:r0:0']",
            costumesTab: "*[@id='panel:r0:1']",
            modal: '*[contains(concat(" ", @class, " "), " ReactModalPortal ")]',
            reportedValue: '*[contains(concat(" ", @class, " "), " blocklyDropDownContent ")]',
            soundsTab: "*[@id='panel:r0:2']",
            spriteTile: '*[contains(concat(" ", @class), " sprite-selector-item")]',
            menuBar: '*[contains(concat(" ", @class), " menu-bar_menu-bar_")]',
            monitors: '*[contains(concat(" ", @class), " stage_monitor-wrapper_")]',
            contextMenu: '*[contains(concat(" ", @class), " context-menu")]'
        };
    }

    /**
     * Instantiate a new Selenium driver.
     * @returns {webdriver.ThenableWebDriver} The new driver.
     */
    getDriver () {
        const chromeCapabilities = webdriver.Capabilities.chrome();
        const args = [];
        if (USE_HEADLESS) {
            args.push('--headless');
        }

        // Stub getUserMedia to always not allow access
        args.push('--use-fake-ui-for-media-stream=deny');

        // Suppress complaints about AudioContext starting before a user gesture
        // This is especially important on Windows, where Selenium directs JS console messages to stdout
        args.push('--autoplay-policy=no-user-gesture-required');

        chromeCapabilities.set('chromeOptions', {args});
        chromeCapabilities.setLoggingPrefs({
            performance: 'ALL'
        });
        this.driver = new webdriver.Builder()
            .forBrowser('chrome')
            .withCapabilities(chromeCapabilities)
            .build();
        return this.driver;
    }

    /**
     * Instantiate a new Selenium driver for Sauce Labs.
     * @param {string} username The Sauce Labs username.
     * @param {string} accessKey The Sauce Labs access key.
     * @param {object} configs The Sauce Labs configuration.
     * @param {string} configs.browserName The name of the desired browser.
     * @param {string} configs.platform The name of the desired platform.
     * @param {string} configs.version The desired browser version.
     * @returns {webdriver.ThenableWebDriver} The new driver.
     */
    getSauceDriver (username, accessKey, configs) {
        this.driver = new webdriver.Builder()
            .withCapabilities({
                browserName: configs.browserName,
                platform: configs.platform,
                version: configs.version,
                username: username,
                accessKey: accessKey
            })
            .usingServer(`http://${username}:${accessKey}@ondemand.saucelabs.com:80/wd/hub`)
            .build();
        return this.driver;
    }

    /**
     * Find an element by xpath.
     * @param {string} xpath The xpath to search for.
     * @returns {Promise<webdriver.WebElement>} A promise that resolves to the element.
     */
    async findByXpath (xpath) {
        const outerError = new Error(`findByXpath failed with arguments:\n\txpath: ${xpath}`);
        try {
            await this.setTitle(`findByXpath ${xpath}`);
            const el = await this.driver.wait(until.elementLocated(By.xpath(xpath)), DEFAULT_TIMEOUT_MILLISECONDS);
            // await this.driver.wait(() => el.isDisplayed(), DEFAULT_TIMEOUT_MILLISECONDS);
            return el;
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Generate an xpath that finds an element by its text.
     * @param {string} text The text to search for.
     * @param {string} [scope] An optional xpath scope to search within.
     * @returns {string} The xpath.
     */
    textToXpath (text, scope) {
        return `//body//${scope || '*'}//*[contains(text(), '${text}')]`;
    }

    /**
     * Find an element by its text.
     * @param {string} text The text to search for.
     * @param {string} [scope] An optional xpath scope to search within.
     * @returns {Promise<webdriver.WebElement>} A promise that resolves to the element.
     */
    findByText (text, scope) {
        return this.findByXpath(this.textToXpath(text, scope));
    }

    /**
     * Check if an element exists by its text.
     * @param {string} text The text to search for.
     * @param {string} [scope] An optional xpath scope to search within.
     * @returns {Promise<boolean>} A promise that resolves to true if the element exists.
     */
    async textExists (text, scope) {
        const outerError = new Error(`textExists failed with arguments:\n\ttext: ${text}\n\tscope: ${scope}`);
        try {
            await this.setTitle(`textExists ${text}`);
            const elements = await this.driver.findElements(By.xpath(this.textToXpath(text, scope)));
            return elements.length > 0;
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Load a URI in the driver.
     * @param {string} uri The URI to load.
     * @returns {Promise} A promise that resolves when the URI is loaded.
     */
    async loadUri (uri) {
        const outerError = new Error(`loadUri failed with arguments:\n\turi: ${uri}`);
        try {
            await this.setTitle(`loadUri ${uri}`);
            // TODO: The height is set artificially high to fix this test:
            // 'Loading with locale shows correct translation for string length block parameter'
            // which fails because the block is offscreen.
            // We should set this back to 1024x768 once we find a good way to fix that test.
            // Using `scrollIntoView` didn't seem to do the trick.
            const WINDOW_WIDTH = 1024;
            const WINDOW_HEIGHT = 960;
            await this.driver
                .get(`file://${uri}`);
            await this.driver
                .executeScript('window.onbeforeunload = undefined;');
            await this.driver.manage().window()
                .setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
            await this.driver.wait(
                async () => await this.driver.executeScript('return document.readyState;') === 'complete',
                DEFAULT_TIMEOUT_MILLISECONDS
            );
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Click an element by xpath.
     * @param {string} xpath The xpath to click.
     * @returns {Promise<void>} A promise that resolves when the element is clicked.
     */
    async clickXpath (xpath) {
        const outerError = new Error(`clickXpath failed with arguments:\n\txpath: ${xpath}`);
        try {
            await this.setTitle(`clickXpath ${xpath}`);
            const el = await this.findByXpath(xpath);
            return el.click();
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Click an element by its text.
     * @param {string} text The text to click.
     * @param {string} [scope] An optional xpath scope to search within.
     * @returns {Promise<void>} A promise that resolves when the element is clicked.
     */
    async clickText (text, scope) {
        const outerError = new Error(`clickText failed with arguments:\n\ttext: ${text}\n\tscope: ${scope}`);
        try {
            await this.setTitle(`clickText ${text}`);
            const el = await this.findByText(text, scope);
            return el.click();
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Click a category in the blocks pane.
     * @param {string} categoryText The text of the category to click.
     * @returns {Promise<void>} A promise that resolves when the category is clicked.
     */
    async clickBlocksCategory (categoryText) {
        const outerError = new Error(`clickBlocksCategory failed with arguments:\n\tcategoryText: ${categoryText}`);
        // The toolbox is destroyed and recreated several times, so avoid clicking on a nonexistent element and erroring
        // out. First we wait for the block pane itself to appear, then wait 100ms for the toolbox to finish refreshing,
        // then finally click the toolbox text.
        try {
            await this.setTitle(`clickBlocksCategory ${categoryText}`);
            await this.findByXpath('//div[contains(concat(" ", @class), " blocks_blocks_")]');
            await this.driver.sleep(100);
            await this.clickText(categoryText, 'div[contains(concat(" ", @class), " blocks_blocks_")]');
            await this.driver.sleep(500); // Wait for scroll to finish
        } catch (cause) {
            throw await enhanceError(outerError, cause);
        }
    }

    /**
     * Right click an element by its text.
     * @param {string} text The text to right click.
     * @param {string} [scope] An optional xpath scope to search within.
     * @returns {Promise<void>} A promise that resolves when the element is right clicked.
     */
    async rightClickText (text, scope) {
        const outerError = new Error(`rightClickText failed with arguments:\n\ttext: ${text}\n\tscope: ${scope}`);
        try {
            await this.setTitle(`rightClickText ${text}`);
            const el = await this.findByText(text, scope);
            return this.driver.actions()
                .click(el, Button.RIGHT)
                .perform();
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Click a button by its text.
     * @param {string} text The text to click.
     * @returns {Promise<void>} A promise that resolves when the button is clicked.
     */
    async clickButton (text) {
        const outerError = new Error(`clickButton failed with arguments:\n\ttext: ${text}`);
        try {
            await this.setTitle(`clickButton ${text}`);
            await this.clickXpath(`//button//*[contains(text(), '${text}')]`);
        } catch (cause) {
            throw await enhanceError(outerError, cause, this.driver);
        }
    }

    /**
     * Get selected browser log entries.
     * @param {Array.<string>} [whitelist] An optional list of log strings to allow. Default: see implementation.
     * @returns {Promise<Array.<webdriver.logging.Entry>>} A promise that resolves to the log entries.
     */
    async getLogs (whitelist) {
        const outerError = new Error(`getLogs failed with arguments:\n\twhitelist: ${whitelist}`);
        try {
            await this.setTitle(`getLogs ${whitelist}`);
            if (!whitelist) {
                // Default whitelist
                whitelist = [
                    'The play() request was interrupted by a call to pause()'
                ];
            }
            const entries = await this.driver.manage()
                .logs()
                .get('browser');
            return entries.filter(entry => {
                const message = entry.message;
                for (const element of whitelist) {
                    if (message.indexOf(element) !== -1) {
                        return false;
                    } else if (entry.level !== 'SEVERE') { // WARNING: this doesn't do what it looks like it does!
                        return false;
                    }
                }
                return true;
            });
        } catch (cause) {
            throw await enhanceError(outerError, cause);
        }
    }
}

export default SeleniumHelper;
