import {combineReducers} from 'redux';

module.exports = combineReducers({
    tool: require('./tools'),
    brushTool: require('./brush-tool')
});
