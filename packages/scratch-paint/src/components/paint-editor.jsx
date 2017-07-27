import PropTypes from 'prop-types';
import React from 'react';
import PaperCanvas from '../containers/paper-canvas.jsx';

const PaintEditorComponent = props => (
    <PaperCanvas
        tool={props.tool}
    />
);

PaintEditorComponent.propTypes = {
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};

export default PaintEditorComponent;
