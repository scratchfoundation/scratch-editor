import path from 'path';
import SeleniumHelper from '../helpers/selenium-helper';
import {Key} from 'selenium-webdriver';

const SLEEP_TIME = 50;

const {
    findByXpath,
    getDriver,
    loadUri,
    clickKey,
    clickKeys
} = new SeleniumHelper();

const uri = path.resolve(__dirname, '../../build/index.html');

let driver;

const SETTINGS_MENU_XPATH = '//button[@aria-label="Settings menu"]';
const FILE_MENU_XPATH = '//button[@aria-label="File menu"]';
const EDIT_MENU_XPATH = '//button[@aria-label="Edit menu"]';

/* Notes:
    - Might need to change in case menus/submenus are moved around/reordered
    - Added sleep time to ensure consistency between different keyboard events
*/
describe('Menu bar keyboard navigation', () => {
    beforeAll(() => {
        driver = getDriver();
    });
    
    afterAll(async () => {
        await driver.quit();
    });

    beforeEach(async () => {
        await loadUri(uri);
    });

    test('can navigate through the menu items with Tab', async () => {
        await clickKey(Key.TAB);
        let activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('Home');

        await clickKey(Key.TAB);
        activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('Settings menu');

        await clickKey(Key.TAB);
        activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('File menu');

        await clickKey(Key.TAB);
        activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('Edit menu');
    });
 
    test('can open File menu with Enter', async () => {
        const fileMenuButton = await findByXpath(FILE_MENU_XPATH);

        expect(await fileMenuButton.getAttribute('aria-expanded')).toBe('false');

        await driver.executeScript('arguments[0].focus()', fileMenuButton);
        await clickKey(Key.ENTER);

        expect(await fileMenuButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('can open File menu with Space', async () => {
        const fileMenuButton = await findByXpath(FILE_MENU_XPATH);

        expect(await fileMenuButton.getAttribute('aria-expanded')).toBe('false');

        await driver.executeScript('arguments[0].focus()', fileMenuButton);
        await clickKey(Key.SPACE);

        expect(await fileMenuButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('can move focus to the last item in file menu with Arrow_Up', async () => {
        const fileMenuButton = await findByXpath(FILE_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', fileMenuButton);
        await clickKey(Key.ENTER);

        await clickKey(Key.ARROW_UP);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();

        expect(text).toBe('Save to your computer');
    });
 
    test('can open Edit menu with Enter', async () => {
        const editMenuButton = await findByXpath(EDIT_MENU_XPATH);

        expect(await editMenuButton.getAttribute('aria-expanded')).toBe('false');

        await driver.executeScript('arguments[0].focus()', editMenuButton);
        await clickKey(Key.ENTER);

        expect(await editMenuButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('can open Edit menu with Space', async () => {
        const editMenuButton = await findByXpath(EDIT_MENU_XPATH);

        expect(await editMenuButton.getAttribute('aria-expanded')).toBe('false');

        await driver.executeScript('arguments[0].focus()', editMenuButton);
        await clickKey(Key.SPACE);

        expect(await editMenuButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('can move focus to the last item in edit menu with Arrow_Up', async () => {
        const editMenuButton = await findByXpath(EDIT_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', editMenuButton);
        await clickKey(Key.ENTER);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('Restore');

        await clickKey(Key.ARROW_UP);

        const activeElement2 = await driver.switchTo().activeElement();
        const text2 = await activeElement2.getText();

        expect(text2).toBe('Turn on Turbo Mode');
    });

    test('can move focus back to the first item in edit menu with Arrow_Down twice', async () => {
        const editMenuButton = await findByXpath(EDIT_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', editMenuButton);
        await clickKeys([Key.ENTER, Key.ARROW_DOWN, Key.ARROW_DOWN]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();

        expect(text).toBe('Restore');
    });

    test('can open submenu with Enter', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ENTER]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('English'); // language submenu
    });

    test('can open submenu with Space', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.SPACE, Key.SPACE]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('English'); // language submenu
    });

    test('can open submenu with Arrow_Right', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ARROW_RIGHT]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('English');
    });

    test('can close submenu with Arrow_Left', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ARROW_RIGHT, Key.ARROW_LEFT]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('Language');

        
    });

    test('can close submenu with Escape', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ARROW_RIGHT, Key.ESCAPE]);

        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('Language');
    });

    test('can close Settings menu with Tab', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ENTER, Key.TAB]);
        
        const activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('File menu');
    });
    
    test('can close Settings menu with Tab after arrows nav', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        let activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('Settings menu');
        
        await clickKeys([Key.ENTER, Key.ARROW_DOWN, Key.ENTER, Key.TAB]);
        activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('File menu');
    });

    test('can close File menu with Tab', async () => {
        const fileMenuButton = await findByXpath(FILE_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', fileMenuButton);
        await clickKeys([Key.ENTER, Key.TAB]);

        const activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('Edit menu');
    });

    test('can close Edit menu with Shift+Tab and go back to File menu', async () => {
        const editMenuButton = await findByXpath(EDIT_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', editMenuButton);
        await clickKey(Key.ENTER);
        await driver.actions()
            .keyDown(Key.SHIFT)
            .sendKeys(Key.TAB)
            .keyUp(Key.SHIFT)
            .perform();
        await driver.sleep(SLEEP_TIME);

        const activeElement = await driver.switchTo().activeElement();
        expect(await activeElement.getAttribute('aria-label')).toBe('File menu');
    });

    test('can change to RTL language and change ARROW_LEFT and ARROW_RIGHT behavior', async () => {
        const settingsMenuButton = await findByXpath(SETTINGS_MENU_XPATH);
        await driver.executeScript('arguments[0].focus()', settingsMenuButton);
        await clickKeys([Key.ENTER, Key.ARROW_RIGHT]);
        const persianMenuItem = await findByXpath(
            '//li[normalize-space(text())="فارسی"]'
        );
        await persianMenuItem.click();
        await clickKey(Key.ENTER);

        await clickKeys([Key.TAB, Key.TAB, Key.ENTER]);

        await clickKey(Key.ARROW_LEFT);
        const activeElement = await driver.switchTo().activeElement();
        const text = await activeElement.getText();
        expect(text).toBe('فارسی');
        const englishMenuItem = await findByXpath('//li[text()="English"]');
        await englishMenuItem.click();

        await clickKeys([Key.TAB, Key.TAB]);
        const activeElement2 = await driver.switchTo().activeElement();
        expect(await activeElement2.getAttribute('aria-label')).toBe('Settings menu');
    });
});
