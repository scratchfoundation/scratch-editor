const OPEN_MODAL = 'scratch-paint/modals/OPEN_MODAL';
const CLOSE_MODAL = 'scratch-paint/modals/CLOSE_MODAL';

const MODAL_FILL_COLOR = 'fillColor';
const MODAL_STROKE_COLOR = 'strokeColor';

const initialState = {
    [MODAL_FILL_COLOR]: false,
    [MODAL_STROKE_COLOR]: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case OPEN_MODAL:
        return Object.assign({}, initialState, {
            [action.modal]: true
        });
    case CLOSE_MODAL:
        return Object.assign({}, initialState, {
            [action.modal]: false
        });
    default:
        return state;
    }
};

const openModal = function (modal) {
    return {
        type: OPEN_MODAL,
        modal: modal
    };
};

const closeModal = function (modal) {
    return {
        type: CLOSE_MODAL,
        modal: modal
    };
};

// Action creators ==================================

const openFillColor = function () {
    return openModal(MODAL_FILL_COLOR);
};

const openStrokeColor = function () {
    return openModal(MODAL_STROKE_COLOR);
};

const closeFillColor = function () {
    return closeModal(MODAL_FILL_COLOR);
};

const closeStrokeColor = function () {
    return closeModal(MODAL_STROKE_COLOR);
};

export {
    reducer as default,
    openFillColor,
    openStrokeColor,
    closeFillColor,
    closeStrokeColor
};
