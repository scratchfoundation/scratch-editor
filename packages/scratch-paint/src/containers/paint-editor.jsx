import PropTypes from 'prop-types';
import React from 'react';
import PaintEditorComponent from '../components/paint-editor.jsx';
import {changeMode} from '../reducers/modes';
import Modes from '../modes/modes';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import paper from 'paper';

class PaintEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleUpdateSvg'
        ]);
    }
    componentDidMount () {
        document.addEventListener('keydown', this.props.onKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.props.onKeyPress);
    }
    handleUpdateSvg () {
        if (!this.props.onUpdateSvg) {
            return;
        }
        this.props.onUpdateSvg(
            paper.project.exportSVG({asString: true}) // TODO can this be made independent of paper
        );
    }
    render () {
        return (
            <PaintEditorComponent
                svg={this.props.svg}
                onUpdateSvg={this.handleUpdateSvg}
            />
        );
    }
}

PaintEditor.propTypes = {
    onKeyPress: PropTypes.func.isRequired,
    onUpdateSvg: PropTypes.func.isRequired,
    svg: PropTypes.string
};

const mapDispatchToProps = dispatch => ({
    onKeyPress: event => {
        if (event.key === 'e') {
            dispatch(changeMode(Modes.ERASER));
        } else if (event.key === 'b') {
            dispatch(changeMode(Modes.BRUSH));
        } else if (event.key === 'l') {
            dispatch(changeMode(Modes.LINE));
        }
    }
});

export default connect(
    null,
    mapDispatchToProps
)(PaintEditor);
