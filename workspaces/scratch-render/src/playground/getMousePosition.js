// Adapted from code by Simon Sarris: http://stackoverflow.com/a/10450761
const getMousePos = function (event, element) {
    const stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(element, null).paddingLeft, 10) || 0;
    const stylePaddingTop = parseInt(document.defaultView.getComputedStyle(element, null).paddingTop, 10) || 0;
    const styleBorderLeft = parseInt(document.defaultView.getComputedStyle(element, null).borderLeftWidth, 10) || 0;
    const styleBorderTop = parseInt(document.defaultView.getComputedStyle(element, null).borderTopWidth, 10) || 0;

    // Some pages have fixed-position bars at the top or left of the page
    // They will mess up mouse coordinates and this fixes that
    const html = document.body.parentNode;
    const htmlTop = html.offsetTop;
    const htmlLeft = html.offsetLeft;

    // Compute the total offset. It's possible to cache this if you want
    let offsetX = 0;
    let offsetY = 0;
    if (typeof element.offsetParent !== 'undefined') {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    // This part is not strictly necessary, it depends on your styling
    offsetX += stylePaddingLeft + styleBorderLeft + htmlLeft;
    offsetY += stylePaddingTop + styleBorderTop + htmlTop;

    // We return a simple javascript object with x and y defined
    return {
        x: event.pageX - offsetX,
        y: event.pageY - offsetY
    };
};

module.exports = getMousePos;
