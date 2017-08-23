import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor.jsx';
import {changeMode} from '../reducers/modes';
import Modes from '../modes/modes';
import {connect} from 'react-redux';

class PaintEditor extends React.Component {
    componentDidMount () {
        document.addEventListener('keydown', this.props.onKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.props.onKeyPress);
    }
    render () {
        return (
            <PaintEditorComponent />
        );
    }
}

PaintEditor.propTypes = {
    onKeyPress: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onKeyPress: event => {
        if (event.key === 'e') {
            dispatch(changeMode(Modes.ERASER));
        } else if (event.key === 'b') {
            dispatch(changeMode(Modes.BRUSH));
        }
    }
});

export default connect(
    null,
    mapDispatchToProps
)(PaintEditor);
