// @ts-check
const {test, expect} = require('@playwright/test');

// Regression tests for hover feedback during block drags.
//
// Before these fixes, the dragged block's SVG children (with
// pointer-events:auto) intercepted hover from elements underneath,
// preventing CSS :hover effects and onPointerEnter handlers from
// firing on drag targets like sprite tiles and the stage selector.

/**
 * Find a visible flyout block and return its center coordinates.
 */
const findVisibleFlyoutBlock = function (page) {
    return page.evaluate(() => {
        const blocks = document.querySelectorAll('.blocklyFlyout .blocklyDraggable');
        for (const b of blocks) {
            const rect = b.getBoundingClientRect();
            if (rect.y > 80 && rect.y < window.innerHeight && rect.height > 20 && rect.width > 50) {
                return {x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2)};
            }
        }
        return null;
    });
};

/**
 * Start dragging a block from the flyout into the workspace.
 */
const startBlockDrag = async function (page) {
    const block = await findVisibleFlyoutBlock(page);
    if (!block) throw new Error('No visible flyout block found');
    await page.mouse.move(block.x, block.y);
    await page.mouse.down();
    await page.mouse.move(block.x + 200, block.y, {steps: 10});
};

test('stage selector scales when a block is dragged over it', async ({page}) => {
    await page.goto('index.html');

    const stageSelector = page.locator('[class*="stage-selector_stage-selector"]').first();
    await expect(stageSelector).toBeVisible();

    await startBlockDrag(page);

    // Drag to the stage selector
    const stageBox = await stageSelector.boundingBox();
    await page.mouse.move(
        stageBox.x + (stageBox.width / 2),
        stageBox.y + (stageBox.height / 2),
        {steps: 10}
    );

    // Wait for .raised (blockDrag Redux state has a 30ms throttle)
    await expect(stageSelector).toHaveClass(/raised/, {timeout: 2000});

    // Nudge so the browser re-evaluates :hover
    await page.mouse.move(
        stageBox.x + (stageBox.width / 2) + 1,
        stageBox.y + (stageBox.height / 2) + 1
    );

    // .raised:hover { transform: scale(1.05) }
    // Wait for the CSS transition to reach the target scale.
    await expect(async () => {
        const scale = await stageSelector.evaluate(el => {
            const m = getComputedStyle(el).transform;
            const match = m.match(/matrix\(([^,]+)/);
            return match ? parseFloat(match[1]) : 1;
        });
        expect(scale).toBeGreaterThan(1);
    }).toPass({timeout: 2000});

    await page.mouse.up();
});

test('sprite tile scales when a block is dragged over it', async ({page}) => {
    await page.goto('index.html');

    // The editing target's tile doesn't get .raised, so we need a
    // second sprite. Duplicate Sprite1 by right-clicking it.
    const spriteTiles = page.locator('[role="button"][class*="sprite-selector-item"]');
    const sprite1 = page.locator('text=Sprite1').first();
    await sprite1.click({button: 'right'});
    await page.getByText('duplicate', {exact: false}).click();
    await expect(spriteTiles).toHaveCount(2);

    // Sprite2 is now selected (editing target). Sprite1's tile will
    // get .raised during a block drag from Sprite2's workspace.
    const sprite1Tile = spriteTiles.filter({has: page.locator('text=Sprite1')}).first();
    await expect(sprite1Tile).toBeVisible();

    await startBlockDrag(page);

    const tileBox = await sprite1Tile.boundingBox();
    await page.mouse.move(
        tileBox.x + (tileBox.width / 2),
        tileBox.y + (tileBox.height / 2),
        {steps: 10}
    );

    // Wait for .raised (blockDrag has a 30ms throttle)
    await expect(sprite1Tile).toHaveClass(/raised/, {timeout: 2000});

    // Nudge so the browser re-evaluates :hover
    await page.mouse.move(
        tileBox.x + (tileBox.width / 2) + 1,
        tileBox.y + (tileBox.height / 2) + 1
    );

    // .raised:hover { transform: scale(1.05); animation-name: wiggle }
    await expect(async () => {
        const scale = await sprite1Tile.evaluate(el => {
            const m = getComputedStyle(el).transform;
            const match = m.match(/matrix\(([^,]+)/);
            return match ? parseFloat(match[1]) : 1;
        });
        expect(scale).toBeGreaterThan(1);
    }).toPass({timeout: 2000});

    await page.mouse.up();
});
