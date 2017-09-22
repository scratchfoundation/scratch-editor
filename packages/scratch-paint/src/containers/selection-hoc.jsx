import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';
import paper from 'paper';

const SelectionHOC = function (WrappedComponent) {
    class SelectionComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'removeItemById'
            ]);
        }
        componentDidMount () {
            if (this.props.hoveredItemId) {
                paper.view.update();
            }
        }
        componentDidUpdate (prevProps) {
            // Hovered item has changed
            if ((this.props.hoveredItemId && this.props.hoveredItemId !== prevProps.hoveredItemId) ||
                    (!this.props.hoveredItemId && prevProps.hoveredItemId)) {
                // Remove the old hover item if any
                this.removeItemById(prevProps.hoveredItemId);
            }
        }
        removeItemById (itemId) {
            if (itemId) {
                const match = paper.project.getItem({
                    match: item => (item.id === itemId)
                });
                if (match) {
                    match.remove();
                }
            }
        }
        render () {
            const {
                hoveredItemId, // eslint-disable-line no-unused-vars
                ...props
            } = this.props;
            return (
                <WrappedComponent {...props} />
            );
        }
    }
    SelectionComponent.propTypes = {
        hoveredItemId: PropTypes.number
    };

    const mapStateToProps = state => ({
        hoveredItemId: state.scratchPaint.hoveredItemId
    });
    return connect(
        mapStateToProps
    )(SelectionComponent);
};

export default SelectionHOC;
