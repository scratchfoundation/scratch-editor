const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const MathUtil = require('../../util/math-util');
const formatMessage = require('format-message');
const Video = require('../../io/video');
const TargetType = require('../../extension-support/target-type');
const {distance, toScratchCoords} = require('./utils');

const FaceDetection = require('@tensorflow-models/face-detection');
const mediapipePackage = require('@mediapipe/face_detection/package.json');

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIxNS41IiBjeT0iMTcuNSIgcj0iMS41IiBmaWxsPSIjNGM5N2ZmIi8+PGNpcmNsZSBjeD0iMjQuNSIgY3k9IjE3LjUiIHI9IjEuNSIgZmlsbD0iIzRjOTdmZiIvPjxwYXRoIGZpbGw9IiM0Yzk3ZmYiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTIwIDlDMTMuOTI1IDkgOSAxMy45MjUgOSAyMHM0LjkyNSAxMSAxMSAxMSAxMS00LjkyNSAxMS0xMVMyNi4wNzUgOSAyMCA5bTAgMmE5IDkgMCAxIDEgMCAxOCA5IDkgMCAwIDEgMC0xOCIvPjxwYXRoIGZpbGw9IiM0ZDk3ZmYiIGZpbGwtb3BhY2l0eT0iLjUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTM1IDRhMSAxIDAgMCAxIC45OTMuODgzTDM2IDV2NmExIDEgMCAwIDEtMS45OTMuMTE3TDM0IDExVjZoLTVhMSAxIDAgMCAxLS45OTMtLjg4M0wyOCA1YTEgMSAwIDAgMSAuODgzLS45OTNMMjkgNHpNNSAzNmExIDEgMCAwIDEtLjk5My0uODgzTDQgMzV2LTZhMSAxIDAgMCAxIDEuOTkzLS4xMTdMNiAyOXY1aDVhMSAxIDAgMCAxIC45OTMuODgzTDEyIDM1YTEgMSAwIDAgMS0uODgzLjk5M0wxMSAzNnoiLz48cGF0aCBmaWxsPSIjNGM5N2ZmIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0yMi4xNjggMjEuOTQ1YTEgMSAwIDEgMSAxLjY2NCAxLjExQzIyLjk3NCAyNC4zNDIgMjEuNjU4IDI1IDIwIDI1cy0yLjk3NC0uNjU4LTMuODMyLTEuOTQ1YTEgMSAwIDEgMSAxLjY2NC0xLjExQzE4LjMwNyAyMi42NTggMTguOTkyIDIzIDIwIDIzczEuNjkzLS4zNDIgMi4xNjgtMS4wNTUiLz48cGF0aCBmaWxsPSIjZmZiZjAwIiBkPSJNMjkuNzIgMjQuMDI4YTIuNTYgMi41NiAwIDAgMCAxLjgwOC0xLjgwOGwuNTQ0LTIuMDA5Yy4yNTItLjk0OCAxLjYtLjk0OCAxLjg1NiAwbC41NCAyLjAwOWEyLjU2IDIuNTYgMCAwIDAgMS44MTMgMS44MDhsMi4wMDguNTQ0Yy45NDguMjUyLjk0OCAxLjYgMCAxLjg1N2wtMi4wMDguNTRhMi41NiAyLjU2IDAgMCAwLTEuODEzIDEuODA4bC0uNTQgMi4wMDljLS4yNTYuOTUyLTEuNjA0Ljk1Mi0xLjg1NiAwbC0uNTQ0LTIuMDA5YTIuNTYgMi41NiAwIDAgMC0xLjgwOS0xLjgwOGwtMi4wMDgtLjU0Yy0uOTQ4LS4yNTYtLjk0OC0xLjYwNSAwLTEuODU3bDIuMDA4LS41NDR6TTUuMDQgNi4zOTZBMS45MiAxLjkyIDAgMCAwIDYuMzk2IDUuMDRsLjQwOC0xLjUwN2MuMTg5LS43MSAxLjItLjcxIDEuMzkyIDBsLjQwNSAxLjUwN2ExLjkyIDEuOTIgMCAwIDAgMS4zNiAxLjM1NmwxLjUwNi40MDhjLjcxLjE5LjcxIDEuMiAwIDEuMzkzbC0xLjUwNy40MDVhMS45MiAxLjkyIDAgMCAwLTEuMzU5IDEuMzU2bC0uNDA1IDEuNTA2Yy0uMTkyLjcxNS0xLjIwMy43MTUtMS4zOTIgMGwtLjQwOC0xLjUwNkExLjkyIDEuOTIgMCAwIDAgNS4wNCA4LjYwMmwtMS41MDctLjQwNWMtLjcxLS4xOTItLjcxLTEuMjA0IDAtMS4zOTN6Ii8+PHBhdGggZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIuNSIgZmlsbC1ydWxlPSJub256ZXJvIiBkPSJtMzEuNTg5IDIwLjA4My0uNTQ0IDIuMDA2YTIuMDYgMi4wNiAwIDAgMS0xLjQ1NyAxLjQ1N2wtMi4wMDguNTQ0Yy0xLjQ0LjM4My0xLjQ0IDIuNDMyIDAgMi44MjFsMi4wMS41NGEyLjA2IDIuMDYgMCAwIDEgMS40NTUgMS40NTZsLjU0NCAyLjAxYy4zODMgMS40NDUgMi40MzMgMS40NDUgMi44MjItLjAwMWwuNTQtMi4wMDlhMi4wNiAyLjA2IDAgMCAxIDEuNDU5LTEuNDU1bDIuMDA5LS41NGMxLjQ0Mi0uMzkgMS40NDItMi40NC0uMDAyLTIuODIzbC0yLjAwNi0uNTQzYTIuMDYgMi4wNiAwIDAgMS0xLjQ2LTEuNDU1bC0uNTQtMi4wMWMtLjM5LTEuNDQyLTIuNDM5LTEuNDQyLTIuODIyLjAwMm0xLjg1Ni4yNTkuNTQgMi4wMDhhMy4wNiAzLjA2IDAgMCAwIDIuMTY1IDIuMTZsMi4wMDguNTQ1Yy40NTYuMTIuNDU2Ljc2OCAwIC44OTFsLTIuMDA3LjU0YTMuMDYgMy4wNiAwIDAgMC0yLjE2NiAyLjE2MmwtLjU0IDIuMDA4Yy0uMTIzLjQ1OC0uNzY5LjQ1OC0uODkuMDAybC0uNTQ1LTIuMDExYTMuMDYgMy4wNiAwIDAgMC0yLjE2Mi0yLjE2MWwtMi4wMDctLjU0Yy0uNDU1LS4xMjMtLjQ1NS0uNzctLjAwMS0uODlsMi4wMS0uNTQ1YTMuMDYgMy4wNiAwIDAgMCAyLjE2LTIuMTYybC41NDQtMi4wMDdjLjEyMi0uNDU2Ljc2OS0uNDU2Ljg5MSAwIi8+PHBhdGggZmlsbD0iIzAwMCIgZmlsbC1vcGFjaXR5PSIuNCIgZmlsbC1ydWxlPSJub256ZXJvIiBkPSJtNi4zMiAzLjQwNS0uNDA3IDEuNTA0Yy0uMTMuNDktLjUxMS44Ny0xLjAwNCAxLjAwNWwtMS41MDYuNDA4Yy0xLjIwNC4zMi0xLjIwNCAyLjAzMiAwIDIuMzU3bDEuNTA3LjQwNWMuNDkuMTMxLjg3Mi41MTQgMS4wMDMgMS4wMDNsLjQwOCAxLjUwOGMuMzIgMS4yMDcgMi4wMzMgMS4yMDcgMi4zNTggMGwuNDA1LTEuNTA3YTEuNDIgMS40MiAwIDAgMSAxLjAwNS0xLjAwM2wxLjUwOC0uNDA2YzEuMjA0LS4zMjUgMS4yMDQtMi4wMzctLjAwMi0yLjM1OGwtMS41MDQtLjQwOGExLjQyIDEuNDIgMCAwIDEtMS4wMDctMS4wMDJMOC42OCAzLjQwM2MtLjMyNS0xLjIwNC0yLjAzOC0xLjIwNC0yLjM1OC4wMDJ6bTEuMzkzLjI1OS40MDUgMS41MDZBMi40MiAyLjQyIDAgMCAwIDkuODMgNi44NzlsMS41MDcuNDA4Yy4yMTguMDU4LjIxOC4zNjggMCAuNDI3bC0xLjUwNS40MDVhMi40MiAyLjQyIDAgMCAwLTEuNzEzIDEuNzFsLS40MDUgMS41MDZjLS4wNTkuMjItLjM2OC4yMi0uNDI2LjAwMWwtLjQwOS0xLjUwOWEyLjQyIDIuNDIgMCAwIDAtMS43MS0xLjcwOGwtMS41MDUtLjQwNWMtLjIxNy0uMDU5LS4yMTctLjM3LS4wMDEtLjQyN0w1LjE3IDYuODhhMi40MiAyLjQyIDAgMCAwIDEuNzA5LTEuNzFsLjQwNy0xLjUwNWMuMDU5LS4yMTguMzY5LS4yMTguNDI3IDB6Ii8+PC9nPjwvc3ZnPg==';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDIzLjg0IDIxLjQ2Ij48Y2lyY2xlIGN4PSI4LjM1IiBjeT0iOS42NSIgcj0iLjk3IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTQuMTkiIGN5PSI5LjY1IiByPSIuOTciIGZpbGw9IiNmZmYiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTEuMjcgNC4xNGMtMy45NCAwLTcuMTMgMy4xOS03LjEzIDcuMTNzMy4xOSA3LjEzIDcuMTMgNy4xMyA3LjEzLTMuMTkgNy4xMy03LjEzLTMuMTktNy4xMy03LjEzLTcuMTNtMCAxLjNjMy4yMiAwIDUuODQgMi42MSA1Ljg0IDUuODRzLTIuNjEgNS44NC01Ljg0IDUuODQtNS44NC0yLjYxLTUuODQtNS44NCAyLjYxLTUuODQgNS44NC01Ljg0Ii8+PHBhdGggZmlsbD0iI2ZmYmYwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwYjhlNjkiIHN0cm9rZS1taXRlcmxpbWl0PSIyIiBzdHJva2Utd2lkdGg9Ii41IiBkPSJNMTcuNTcgMTMuODhjLjU3LS4xNSAxLjAyLS42IDEuMTctMS4xN2wuMzUtMS4zYy4xNi0uNjEgMS4wNC0uNjEgMS4yIDBsLjM1IDEuM2MuMTUuNTcuNiAxLjAyIDEuMTggMS4xN2wxLjMuMzVjLjYxLjE2LjYxIDEuMDQgMCAxLjJsLTEuMy4zNWMtLjU3LjE1LTEuMDIuNi0xLjE4IDEuMTdsLS4zNSAxLjNjLS4xNy42Mi0xLjA0LjYyLTEuMiAwbC0uMzUtMS4zYy0uMTUtLjU3LS42LTEuMDItMS4xNy0xLjE3bC0xLjMtLjM1Yy0uNjEtLjE3LS42MS0xLjA0IDAtMS4ybDEuMy0uMzVabS0xNi0xMS40M2MuNDMtLjEyLjc2LS40NS44OC0uODhsLjI2LS45OGMuMTItLjQ2Ljc4LS40Ni45IDBsLjI2Ljk4Yy4xMi40My40NS43Ni44OC44OGwuOTguMjZjLjQ2LjEyLjQ2Ljc4IDAgLjlsLS45OC4yNmMtLjQzLjExLS43Ny40NS0uODguODhsLS4yNi45OGMtLjEyLjQ2LS43OC40Ni0uOSAwbC0uMjYtLjk4YTEuMjYgMS4yNiAwIDAgMC0uODgtLjg4bC0uOTgtLjI2Yy0uNDYtLjEyLS40Ni0uNzggMC0uOXoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTIuNjggMTIuNTNjLjItLjMuNi0uMzguOS0uMThzLjM4LjYuMTguOWMtLjU2LjgzLTEuNDEgMS4yNi0yLjQ4IDEuMjZzLTEuOTMtLjQzLTIuNDgtMS4yNmMtLjItLjMtLjEyLS43LjE4LS45cy43LS4xMi45LjE4Yy4zMS40Ni43NS42OCAxLjQxLjY4czEuMS0uMjIgMS40MS0uNjhaIi8+PHBhdGggZmlsbD0iIzBiOGU2OSIgZD0iTTIwLjg5IDYuMDZhLjU3LjU3IDAgMCAxLS41Ny0uNTdWMi4yaC0zLjMxYy0uMzEgMC0uNTctLjI1LS41Ny0uNTdzLjI1LS41Ny41Ny0uNTdoMy44OGMuMzEgMCAuNTcuMjUuNTcuNTd2My44NmMwIC4zMS0uMjUuNTctLjU3LjU3TTUuNDQgMjEuNDZIMS41OWEuNTcuNTcgMCAwIDEtLjU3LS41N3YtMy44MmMwLS4zMS4yNS0uNTcuNTctLjU3cy41Ny4yNS41Ny41N3YzLjI1aDMuMjhjLjMxIDAgLjU3LjI1LjU3LjU3cy0uMjUuNTctLjU3LjU3Ii8+PC9zdmc+';

/**
 * Face detection keypoints from TensorFlow's face sensing model.
 * @readonly
 * @enum {string}
 */
const PARTS = {
    NOSE: '2',
    MOUTH: '3',
    LEFT_EYE: '0',
    RIGHT_EYE: '1',
    BETWEEN_EYES: '6',
    LEFT_EAR: '4',
    RIGHT_EAR: '5',
    TOP_OF_HEAD: '7'
};

/**
 * Possible tilt directions.
 * @readonly
 * @enum {string}
 */
const TILT = {
    LEFT: 'left',
    RIGHT: 'right'
};

/**
 * Class for the Face sensing blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @class
 */
class Scratch3FaceSensingBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * Cached value for detected face size
         * @type {number}
         */
        this._cachedSize = 100;

        /**
         * Cached value for detected tilt angle
         * @type {number}
         */
        this._cachedTilt = 90;

        /**
         * Smoothed value for whether or not a face was detected
         * @type {boolean}
         */
        this._smoothedIsDetected = false;

        /**
         * History of recent face-detection results
         * @type {Array.<boolean>}
         */
        this._isDetectedArray = Array.from(
            {length: Scratch3FaceSensingBlocks.IS_DETECTED_ARRAY_LENGTH},
            () => false
        );

        this.runtime.emit('EXTENSION_DATA_LOADING', true);

        const model = FaceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: '/chunks/mediapipe/face_detection',
            maxFaces: 1
        };
    
        FaceDetection.createDetector(model, detectorConfig)
            .catch(() => {
                const fallbackConfig = {
                    runtime: 'mediapipe',
                    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@${mediapipePackage.version}`,
                    maxFaces: 1
                };

                return FaceDetection.createDetector(model, fallbackConfig);
            })
            .then(detector => {
                this._faceDetector = detector;
                if (this.runtime.ioDevices) {
                    this._loop();
                }
            });
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 1000 / 15;
    }

    /**
     * Dimensions the video stream is analyzed at after it's rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * Maximum length of face detection history
     * @type {number}
     */
    static get IS_DETECTED_ARRAY_LENGTH () {
        return 5;
    }

    /**
     * Minimum tilt (in degrees) needed before counting as a tilt event.
     * @type {number}
     */
    static get TILT_THRESHOLD () {
        return 10;
    }

    /**
     * Default face part position when no facial keypoints are detected.
     * @type {{x: number, y: number}}
     */
    static get DEFAULT_PART_POSITION () {
        return {x: 0, y: 0};
    }

    /**
     * An array of info about the face part menu choices.
     * @type {object[]}
     */
    get PART_INFO () {
        return [{
            text: formatMessage({
                id: 'faceSensing.nose',
                default: 'nose',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.NOSE
        }, {
            text: formatMessage({
                id: 'faceSensing.mouth',
                default: 'mouth',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.MOUTH
        }, {
            text: formatMessage({
                id: 'faceSensing.leftEye',
                default: 'left eye',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.LEFT_EYE
        }, {
            text: formatMessage({
                id: 'faceSensing.rightEye',
                default: 'right eye',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.RIGHT_EYE
        }, {
            text: formatMessage({
                id: 'faceSensing.betweenEyes',
                default: 'between eyes',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.BETWEEN_EYES
        }, {
            text: formatMessage({
                id: 'faceSensing.leftEar',
                default: 'left ear',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.LEFT_EAR
        }, {
            text: formatMessage({
                id: 'faceSensing.rightEar',
                default: 'right ear',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.RIGHT_EAR
        }, {
            text: formatMessage({
                id: 'faceSensing.topOfHead',
                default: 'top of head',
                description: 'Option for the "go to [PART]" and "when sprite touches [PART] blocks'

            }),
            value: PARTS.TOP_OF_HEAD
        }];
    }

    /**
     * An array of choices about the tilt direction menu.
     * @type {object[]}
     */
    get TILT_INFO () {
        return [{
            text: formatMessage({
                id: 'faceSensing.left',
                default: 'left',
                description: 'Argument for the "when face tilts [DIRECTION]" block'

            }),
            value: TILT.LEFT
        }, {
            text: formatMessage({
                id: 'faceSensing.right',
                default: 'right',
                description: 'Argument for the "when face tilts [DIRECTION]" block'

            }),
            value: TILT.RIGHT
        }];
    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a TypedArray copy of the canvas's pixel data.
     * @private
     */
    _loop () {
        setTimeout(this._loop.bind(this), Math.max(this.runtime.currentStepTime, Scratch3FaceSensingBlocks.INTERVAL));
   
        // Close the alert if the face detector is created and the video loading has either succeeded or failed.
        // The alert will remain open until the permissions are set
        if (!this._firstTime && this._videoLoadingCompleted) {
            this.runtime.emit('EXTENSION_DATA_LOADING', false);
            this._firstTime = true;
        }

        const frame = this.runtime.ioDevices.video.getFrame({
            format: Video.FORMAT_IMAGE_DATA,
            dimensions: Scratch3FaceSensingBlocks.DIMENSIONS,
            cacheTimeout: this.runtime.currentStepTime
        });
        if (frame) {
            this._faceDetector.estimateFaces(frame).then(faces => {
                if (faces && faces.length > 0) {
                    if (!this._firstTime) {
                        this._firstTime = true;
                        this.runtime.emit('EXTENSION_DATA_LOADING', false);
                    }
                    this._currentFace = faces[0];
                } else {
                    this._currentFace = null;
                }
                this._updateIsDetected();
            });
        }
    }

    /**
     * Update the smoothed face-detection state based on the most recent result.
     * @private
     */
    _updateIsDetected () {
        this._isDetectedArray.push(!!this._currentFace);

        if (this._isDetectedArray.length > Scratch3FaceSensingBlocks.IS_DETECTED_ARRAY_LENGTH) {
            this._isDetectedArray.shift();
        }

        // if every recent detection is false, set to false
        if (this._isDetectedArray.every(item => item === false)) {
            this._smoothedIsDetected = false;
        }

        // if every recent detection is true, set to true
        if (this._isDetectedArray.every(item => item === true)) {
            this._smoothedIsDetected = true;
        }

        // if there's a mix of true and false values, do not change the result
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Enable the video layer
        this.runtime.ioDevices.video.enableVideo()
            .finally(() => {
                this._videoLoadingCompleted = true;
            });

        return {
            id: 'faceSensing',
            name: formatMessage({
                id: 'faceSensing.categoryName',
                default: 'Face Sensing',
                description: 'Name of face sensing extension'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'goToPart',
                    text: formatMessage({
                        id: 'faceSensing.goToPart',
                        default: 'go to [PART]',
                        description: 'Command that moves target to [PART]'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'PART',
                            defaultValue: PARTS.NOSE
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'pointInFaceTiltDirection',
                    text: formatMessage({
                        id: 'faceSensing.pointInFaceTiltDirection',
                        default: 'point in direction of face tilt',
                        description: 'Command that points the target in the direction of face tilt'
                    }),
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setSizeToFaceSize',
                    text: formatMessage({
                        id: 'faceSensing.setSizeToFaceSize',
                        default: 'set size to face size',
                        description: 'Command that sets the size of the target to the face size'
                    }),
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                '---',
                {
                    opcode: 'whenTilted',
                    text: formatMessage({
                        id: 'faceSensing.whenTilted',
                        default: 'when face tilts [DIRECTION]',
                        description: 'Event that triggers when face tilts [DIRECTION]'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'TILT',
                            defaultValue: TILT.LEFT
                        }
                    }
                },
                {
                    opcode: 'whenSpriteTouchesPart',
                    text: formatMessage({
                        id: 'faceSensing.whenSpriteTouchesPart',
                        default: 'when this sprite touches a [PART]',
                        description: 'Event that triggers when sprite touches a [PART]'
                    }),
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: 'PART',
                            defaultValue: PARTS.NOSE
                        }
                    },
                    blockType: BlockType.HAT,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'whenFaceDetected',
                    text: formatMessage({
                        id: 'faceSensing.whenFaceDetected',
                        default: 'when a face is detected',
                        description: 'Event that triggers when a face is detected'
                    }),
                    blockType: BlockType.HAT
                },
                '---',
                {
                    opcode: 'faceIsDetected',
                    text: formatMessage({
                        id: 'faceSensing.faceDetected',
                        default: 'a face is detected?',
                        description: 'Reporter that returns whether a face is detected'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'faceTilt',
                    text: formatMessage({
                        id: 'faceSensing.faceTilt',
                        default: 'face tilt',
                        description: 'Reporter that returns the face tilt'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'faceSize',
                    text: formatMessage({
                        id: 'faceSensing.faceSize',
                        default: 'face size',
                        description: 'Reporter that returns the face size'
                    }),
                    blockType: BlockType.REPORTER
                }
            ],
            menus: {
                PART: this.PART_INFO,
                TILT: this.TILT_INFO
            }
        };
    }

    /**
     * Center point of a line between the eyes
     * @returns {{x: number, y: number}} Coordinates of the detected point between eyes.
     * @private
     */
    _getBetweenEyesPosition () {
        const leftEye = this._getPartPosition(PARTS.LEFT_EYE);
        const rightEye = this._getPartPosition(PARTS.RIGHT_EYE);
        const betweenEyes = {x: 0, y: 0};
        betweenEyes.x = leftEye.x + ((rightEye.x - leftEye.x) / 2);
        betweenEyes.y = leftEye.y + ((rightEye.y - leftEye.y) / 2);
        return betweenEyes;
    }

    /**
     * Estimated top of the head point:
     * Make a line perpendicular to the line between the eyes, through
     * its center, and move upward along it the distance from the point
     * between the eyes to the mouth.
     * @returns {{x: number, y: number}} Coordinates of the detected top of head position.
     * @private
     */
    _getTopOfHeadPosition () {
        const leftEyePos = this._getPartPosition(PARTS.LEFT_EYE);
        const rightEyePos = this._getPartPosition(PARTS.RIGHT_EYE);
        const mouthPos = this._getPartPosition(PARTS.MOUTH);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const directionRads = Math.atan2(dy, dx) + (Math.PI / 2);
        const betweenEyesPos = this._getBetweenEyesPosition();
        const mouthDistance = distance(betweenEyesPos, mouthPos);

        const topOfHeadPosition = {x: 0, y: 0};
        topOfHeadPosition.x = betweenEyesPos.x + (mouthDistance * Math.cos(directionRads));
        topOfHeadPosition.y = betweenEyesPos.y + (mouthDistance * Math.sin(directionRads));

        return topOfHeadPosition;
    }

    /**
     * Get the position of a given facial keypoint.
     * Returns {0,0} if no face or keypoints are available.
     * @param {string} part - Part of the face to be detected
     * @returns {{x: number, y: number}} Coordinates of the detected keypoint.
     * @private
     */
    _getPartPosition (part) {
        const defaultPos = Scratch3FaceSensingBlocks.DEFAULT_PART_POSITION;

        if (!this._currentFace) return defaultPos;
        if (!this._currentFace.keypoints) return defaultPos;

        if (part === PARTS.BETWEEN_EYES) {
            return this._getBetweenEyesPosition();
        }
        if (part === PARTS.TOP_OF_HEAD) {
            return this._getTopOfHeadPosition();
        }

        const result = this._currentFace.keypoints[Number(part)];
        if (result) {
            const res = toScratchCoords(result);
            return res;
        }
        return defaultPos;
    }

    /**
     * A scratch hat block handle that reports whether
     * a target sprite is touching a given facial keypoint
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {boolean} - true if the sprite is touching the given point
     */
    whenSpriteTouchesPart (args, util) {
        if (!this._currentFace) return false;
        if (!this._currentFace.keypoints) return false;

        const pos = this._getPartPosition(args.PART);
        return util.target.isTouchingScratchPoint(pos.x, pos.y);
    }

    /**
     * A scratch hat block handle that reports whether
     * a face is detected
     * @returns {boolean} - true a face was detected
     */
    whenFaceDetected () {
        return this._smoothedIsDetected;
    }

    /**
     * A scratch boolean block handle that reports whether
     * a face is detected
     * @returns {boolean} - true a face was detected
     */
    faceIsDetected () {
        return this._smoothedIsDetected;
    }

    /**
     * A scratch reporter block handle that calculates the face size and caches it.
     * @returns {number} the face size
     */
    faceSize () {
        if (!this._currentFace) return this._cachedSize;

        const size = Math.round(this._currentFace.box.height);
        this._cachedSize = size;
        return size;
    }

    /**
     * A scratch command block handle that sets the size of a target to the current face size
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    setSizeToFaceSize (args, util) {
        if (!this._currentFace) return;

        util.target.setSize(this.faceSize());
    }

    /**
     * A scratch reporter block handle that calculates the face tilt and caches it.
     * @returns {number} the face tilt
     */
    faceTilt () {
        if (!this._currentFace) return this._cachedTilt;

        const leftEyePos = this._getPartPosition(PARTS.LEFT_EYE);
        const rightEyePos = this._getPartPosition(PARTS.RIGHT_EYE);
        const dx = rightEyePos.x - leftEyePos.x;
        const dy = rightEyePos.y - leftEyePos.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        const tilt = Math.round(direction);

        this._cachedTilt = tilt;

        return tilt;
    }

    /**
     * A scratch hat block handle that reports whether
     * a detected face is tilted
     * @param {object} args - the block arguments
     * @returns {boolean} - true if the face is tilted
     */
    whenTilted (args) {
        if (args.DIRECTION === TILT.LEFT) {
            return this.faceTilt() < (90 - Scratch3FaceSensingBlocks.TILT_THRESHOLD);
        }
        if (args.DIRECTION === TILT.RIGHT) {
            return this.faceTilt() > (90 + Scratch3FaceSensingBlocks.TILT_THRESHOLD);
        }
        return false;
    }

    /**
     * A scratch command block handle that points a target to the current face tilt direction
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    pointInFaceTiltDirection (args, util) {
        if (!this._currentFace) return;

        util.target.setDirection(this.faceTilt());
    }

    /**
     * A scratch command block handle that moves a target to a given facial keypoint
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     */
    goToPart (args, util) {
        if (!this._currentFace) return;

        const pos = this._getPartPosition(args.PART);
        util.target.setXY(pos.x, pos.y);
    }
}

module.exports = Scratch3FaceSensingBlocks;
