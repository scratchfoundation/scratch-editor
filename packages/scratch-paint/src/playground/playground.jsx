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
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
        '<rect x="25" y="25" width="200" height="200" fill="lime" stroke-width="4" stroke="pink" />' +
        '<circle cx="125" cy="125" r="75" fill="orange" />' +
        '<polyline points="50,150 50,200 200,200 200,100" stroke="red" stroke-width="4" fill="none" />' +
        '<line x1="50" y1="50" x2="200" y2="200" stroke="blue" stroke-width="4" />' +
    '</svg>';
const onUpdateSvg = function () {
    return;
};
ReactDOM.render((
    <Provider store={store}>
        <IntlProvider>
            <PaintEditor
                svg={svgString}
                onUpdateSvg={onUpdateSvg}
            />
        </IntlProvider>
    </Provider>
), appTarget);
