import React from 'react';
import ReactDOM from 'react-dom';
import PaintEditor from '..';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import reducer from './reducers/combine-reducers';
import {intlInitialState, IntlProvider} from './reducers/intl.js';

const appTarget = document.createElement('div');
document.body.appendChild(appTarget);
const store = createStore(
    reducer,
    intlInitialState,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
const svgString =
    '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
            ' x="0px" y="0px" width="32px" height="32px" viewBox="0.5 384.5 32 32"' +
            ' enable-background="new 0.5 384.5 32 32" xml:space="preserve">' +
        '<path fill="none" stroke="#000000" stroke-width="3" stroke-miterlimit="10" d="M7.5,392.241h7.269' +
            'c4.571,0,8.231,5.555,8.231,10.123v7.377"/>' +
        '<polyline points="10.689,399.492 3.193,391.997 10.689,384.5 "/>' +
        '<polyline points="30.185,405.995 22.689,413.491 15.192,405.995 "/>' +
    '</svg>';
const onUpdateSvg = function (newSvgString, rotationCenterX, rotationCenterY) {
    console.log(newSvgString);
    console.log(`rotationCenterX: ${rotationCenterX}    rotationCenterY: ${rotationCenterY}`);
};
ReactDOM.render((
    <Provider store={store}>
        <IntlProvider>
            <PaintEditor
                rotationCenterX={0}
                rotationCenterY={0}
                svg={svgString}
                onUpdateSvg={onUpdateSvg}
            />
        </IntlProvider>
    </Provider>
), appTarget);
