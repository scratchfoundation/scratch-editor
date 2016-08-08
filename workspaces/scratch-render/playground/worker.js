importScripts('../render-worker.js');

var window = self;
var renderer;
var drawableID;
var drawableID2;
var fudge = 90;

onmessage = function(message) {

    if (message.data.fudge != undefined) {
        fudge = message.data.fudge;
    }
    else {
        if (message.data.id == 'RendererConnected') {
            initWorker();
        }

        renderer.onmessage(message);
    }
};

function initWorker() {
    renderer = new window.RenderWebGLWorker();
    var create1 = renderer.createDrawable();
    var create2 = renderer.createDrawable();

    create1.then(function (id) {
        drawableID = id;
        renderer.updateDrawableProperties(drawableID, {
            position: [0, 0],
            scale: 100,
            direction: 90
        });
    });
    create2.then(function (id) {
        drawableID2 = id;
        renderer.updateDrawableProperties(drawableID2, {
            skin: '09dc888b0b7df19f70d81588ae73420e.svg'
        });
    });

    Promise.all([create1, create2]).then(function () {
        setInterval(thinkStep, 1 / 60);
    });
}

function thinkStep() {
    //direction += 0.1;

    var props = {};
    //props.position = [posX, posY];
    props.direction = fudge;
    //props.pixelate = fudge;
    //props.scale = 100;

    renderer.updateDrawableProperties(drawableID, props);
}
