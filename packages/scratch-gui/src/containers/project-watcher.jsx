import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {
    getIsShowingWithId
} from '../reducers/project-state';

/**
 * Watches for project to finish updating before taking some action.
 *
 * To use ProjectWatcher, pass it a callback function using the onDoneUpdating prop.
 * ProjectWatcher passes a waitForUpdate function to its children, which they can call
 * to set ProjectWatcher to request that it call the onDoneUpdating callback when
 * project is no longer updating.
 *
 * The waitForUpdate function accepts an object containing:
 * - isSaving {boolean} Whether the project is currently saving
 * - isSharing {boolean} Whether the project is currently being shared
 */
class ProjectWatcher extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'waitForUpdate'
        ]);

        this.state = {
            saving: false,
            sharing: false
        };
    }
    componentDidUpdate (prevProps) {
        if (this.state.saving && this.state.sharing) {
            if (this.props.isShared && (this.props.isShowingWithId && !prevProps.isShowingWithId)) {
                this.fulfill();
            }
        }
        if (this.state.saving && !this.state.sharing) {
            if (this.props.isShowingWithId && !prevProps.isShowingWithId) {
                this.fulfill();
            }
        }
    }
    fulfill () {
        this.props.onDoneUpdating();
        this.setState({
            saving: false,
            sharing: false
        });
    }
    waitForUpdate (updates = {isSaving: false, isSharing: false}) {
        const {isSaving = false, isSharing = false} = updates;

        if (isSaving || isSharing) {
            this.setState({
                saving: isSaving,
                sharing: isSharing
            });
        } else { // fulfill immediately
            this.fulfill();
        }
    }
    render () {
        return this.props.children(
            this.waitForUpdate
        );
    }
}

ProjectWatcher.propTypes = {
    children: PropTypes.func,
    isShowingWithId: PropTypes.bool,
    isShared: PropTypes.bool,
    onDoneUpdating: PropTypes.func
};

ProjectWatcher.defaultProps = {
    isShared: false,
    onDoneUpdating: () => {}
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    return {
        isShowingWithId: getIsShowingWithId(loadingState)
    };
};

const mapDispatchToProps = () => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectWatcher);
