import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import omit from 'lodash.omit';
import {connect} from 'react-redux';

import {getSelectedLeafItems} from '../helper/selection';
import {setSelectedItems} from '../reducers/selected-items';
import {
    performUndo, performRedo, shouldShowUndo, shouldShowRedo
} from '../helper/undo';
import {undo, redo} from '../reducers/undo';

import Formats, {isBitmap} from '../lib/format';

const UndoHOC = function (WrappedComponent) {
    class UndoWrapper extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'handleUndo',
                'handleRedo',
                'handleSetSelectedItems',
                'shouldShowUndo',
                'shouldShowRedo'
            ]);
        }
        handleUndo () {
            performUndo(this.props.undoState, this.props.onUndo, this.handleSetSelectedItems, this.props.onUpdateImage);
        }
        handleRedo () {
            performRedo(this.props.undoState, this.props.onRedo, this.handleSetSelectedItems, this.props.onUpdateImage);
        }
        handleSetSelectedItems () {
            this.props.setSelectedItems(this.props.format);
        }
        shouldShowUndo () {
            return shouldShowUndo(this.props.undoState);
        }
        shouldShowRedo () {
            return shouldShowRedo(this.props.undoState);
        }
        render () {
            const componentProps = omit(this.props, [
                'format',
                'onUndo',
                'onRedo',
                'setSelectedItems',
                'undoState']);
            return (
                <WrappedComponent
                    shouldShowRedo={this.shouldShowRedo}
                    shouldShowUndo={this.shouldShowUndo}
                    onRedo={this.handleRedo}
                    onUndo={this.handleUndo}
                    {...componentProps}
                />
            );
        }
    }

    UndoWrapper.propTypes = {
        format: PropTypes.oneOf(Object.keys(Formats)),
        onRedo: PropTypes.func.isRequired,
        onUndo: PropTypes.func.isRequired,
        onUpdateImage: PropTypes.func.isRequired,
        setSelectedItems: PropTypes.func.isRequired,
        undoState: PropTypes.shape({
            stack: PropTypes.arrayOf(PropTypes.object).isRequired,
            pointer: PropTypes.number.isRequired
        })
    };

    const mapStateToProps = state => ({
        format: state.scratchPaint.format,
        undoState: state.scratchPaint.undo
    });
    const mapDispatchToProps = dispatch => ({
        setSelectedItems: format => {
            dispatch(setSelectedItems(getSelectedLeafItems(), isBitmap(format)));
        },
        onUndo: format => {
            dispatch(undo(format));
        },
        onRedo: format => {
            dispatch(redo(format));
        }
    });

    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(UndoWrapper);
};

export default UndoHOC;
