import PropTypes from 'prop-types';
import React from 'react';
import PaperCanvas from '../containers/paper-canvas.jsx';
import BrushTool from '../containers/tools/brush-tool.jsx';

const PaintEditorComponent = props => (
    <div>
        <PaperCanvas
            canvasId={props.canvasId}
            tool={props.tool}
        />
        <BrushTool canvasId={props.canvasId} />
    </div>
);

PaintEditorComponent.propTypes = {
    canvasId: PropTypes.string.isRequired,
    tool: PropTypes.shape({
        name: PropTypes.string.isRequired
    })
};


module.exports = PaintEditorComponent;
