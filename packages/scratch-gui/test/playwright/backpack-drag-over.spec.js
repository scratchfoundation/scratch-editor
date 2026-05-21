// @ts-check
const {test, expect} = require('@playwright/test');

// Regression test for the backpack drag-over highlight.
//
// Two bugs prevented the backpack from highlighting when a block was
// dragged over it:
//
// 1. The backpack used onMouseEnter/onMouseLeave, but Blockly calls
//    preventDefault() on pointermove during drags, which suppresses
//    compatibility mouse events on Firefox. Fixed by switching to
//    onPointerEnter/onPointerLeave.
//
// 2. The dragged block's SVG children had pointer-events:auto, causing
//    them to steal hover/pointer events from elements underneath.
//    Fixed by setting pointer-events:none on all drag surface children
//    in scratch-blocks.

test('backpack highlights when a block is dragged over it', async ({page}) => {
    await page.goto('index.html?backpack_host=fake');

    // Expand the backpack.
    await page.getByText('Backpack', {exact: true}).click();
    const backpackList = page.locator('[class*="backpack-list"]').first();
    await expect(backpackList).toBeVisible();

    // Find a visible flyout block. The flyout contains blocks from all
    // categories (187+), most offscreen. Filter to blocks that are in
    // the viewport and large enough to be a real block (not a field).
    const block = await page.evaluate(() => {
        const blocks = document.querySelectorAll('.blocklyFlyout .blocklyDraggable');
        for (const b of blocks) {
            const rect = b.getBoundingClientRect();
            if (rect.y > 80 && rect.y < window.innerHeight && rect.height > 20 && rect.width > 50) {
                return {x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2)};
            }
        }
        return null;
    });
    expect(block, 'should find a visible flyout block').not.toBeNull();

    const backpackBox = await backpackList.boundingBox();

    // Drag a block from the flyout across the workspace to the backpack.
    await page.mouse.move(block.x, block.y);
    await page.mouse.down();
    await page.mouse.move(block.x + 200, block.y, {steps: 10});
    await page.mouse.move(
        backpackBox.x + (backpackBox.width / 2),
        backpackBox.y + (backpackBox.height / 2),
        {steps: 10}
    );

    await expect(backpackList).toHaveClass(/drag-over/);

    await page.mouse.up();
});
