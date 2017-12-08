const ACTIVATE_EYE_DROPPER = 'scratch-paint/eye-dropper/ACTIVATE_COLOR_PICKER';
const DEACTIVATE_EYE_DROPPER = 'scratch-paint/eye-dropper/DEACTIVATE_COLOR_PICKER';

const initialState = {
    active: false,
    callback: () => {}, // this will either be `onChangeFillColor` or `onChangeOutlineColor`
    previousMode: null // the previous mode that was active to go back to
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case ACTIVATE_EYE_DROPPER:
        return Object.assign(
            {},
            state,
            {
                active: true,
                callback: action.callback,
                previousMode: action.previousMode
            }
        );
    case DEACTIVATE_EYE_DROPPER:
        return Object.assign(
            {},
            state,
            {
                active: false,
                callback: () => {},
                previousMode: null
            }
        );
    default:
        return state;
    }
};

const activateEyeDropper = function (currentMode, callback) {
    return {
        type: ACTIVATE_EYE_DROPPER,
        callback: callback,
        previousMode: currentMode
    };
};
const deactivateEyeDropper = function () {
    return {
        type: DEACTIVATE_EYE_DROPPER
    };
};

export {
    reducer as default,
    activateEyeDropper,
    deactivateEyeDropper
};
