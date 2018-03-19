import bindAll from 'lodash.bindall';
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
class Playground extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateName',
            'handleUpdateSvg'
        ]);
        this.state = {
            name: 'meow',
            rotationCenterX: 20,
            rotationCenterY: 400,
            svg: svgString
        };
    }
    handleUpdateName (name) {
        this.setState({name});
    }
    handleUpdateSvg (svg, rotationCenterX, rotationCenterY) {
        console.log(svg);
        console.log(`rotationCenterX: ${rotationCenterX}    rotationCenterY: ${rotationCenterY}`);
        this.setState({svg, rotationCenterX, rotationCenterY});
    }
    render () {
        return (
            <PaintEditor
                {...this.state}
                svgId="meow"
                onUpdateName={this.handleUpdateName}
                onUpdateSvg={this.handleUpdateSvg}
            />
        );
    }

}
ReactDOM.render((
    <Provider store={store}>
        <IntlProvider>
            <Playground />
        </IntlProvider>
    </Provider>
), appTarget);
