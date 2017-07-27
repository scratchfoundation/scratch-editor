import {combineReducers} from 'redux';
import toolReducer from './tools';

export default combineReducers({
    tool: toolReducer
});
