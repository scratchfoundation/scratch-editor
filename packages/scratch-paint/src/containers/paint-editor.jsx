import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor.jsx';
import tools from '../reducers/tools';
import ToolTypes from '../tools/tool-types.js';
import {connect} from 'react-redux';

class PaintEditor extends React.Component {
    componentDidMount () {
        const onKeyPress = this.props.onKeyPress;
        document.onkeydown = function (e) {
            e = e || window.event;
            onKeyPress(e);
        };
    }
    render () {
        return (
            <PaintEditorComponent
                tool={this.props.tool}
            />
        );
    }
}

PaintEditor.propTypes = {
    onKeyPress: PropTypes.func.isRequired,
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};

const mapStateToProps = state => ({
    tool: state.tool
});
const mapDispatchToProps = dispatch => ({
    onKeyPress: e => {
        if (e.key === 'e') {
            dispatch(tools.changeTool(ToolTypes.ERASER));
        } else if (e.key === 'b') {
            dispatch(tools.changeTool(ToolTypes.BRUSH));
        }
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PaintEditor);
