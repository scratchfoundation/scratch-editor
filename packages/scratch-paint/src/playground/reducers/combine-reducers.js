import {combineReducers} from 'redux';
import intlReducer from './intl';
import {ScratchPaintReducer} from '../..';

export default combineReducers({
    intl: intlReducer,
    scratchPaint: ScratchPaintReducer
});
