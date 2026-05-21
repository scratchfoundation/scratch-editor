import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';

import VM from '@scratch/scratch-vm';

import {
    getIsShowingWithId
} from '../reducers/project-state';

import {
    showAlertWithTimeout
} from '../reducers/alerts';
import {GUIStoragePropType} from '../gui-config';

/*
 * Higher Order Component to manage the connection to the cloud server.
 * @param {React.Component} WrappedComponent component to manage VM events for
 * @returns {React.Component} connected component with vm events bound to redux
 */
const cloudManagerHOC = function (WrappedComponent) {
    class CloudManager extends React.Component {
        constructor (props) {
            super(props);

            this.cloudProvider = null;
            bindAll(this, [
                'handleCloudDataUpdate',
                'handleExtensionAdded'
            ]);

            this.props.vm.on('HAS_CLOUD_DATA_UPDATE', this.handleCloudDataUpdate);
            this.props.vm.on('EXTENSION_ADDED', this.handleExtensionAdded);
        }
        componentDidMount () {
            if (this.shouldConnect(this.props)) {
                this.connectToCloud();
            }
        }
        componentDidUpdate (prevProps) {
            // TODO need to add cloud provider disconnection logic and cloud data clearing logic
            // when loading a new project e.g. via file upload
            // (and eventually move it out of the vm.clear function)

            if (this.shouldConnect(this.props) && !this.shouldConnect(prevProps)) {
                this.connectToCloud();
            }

            if (this.shouldDisconnect(this.props, prevProps)) {
                this.disconnectFromCloud();
            }
        }
        componentWillUnmount () {
            // Make sure to clean up old handlers as otherwise we end up with multiple connections at the same time
            this.props.vm.off('HAS_CLOUD_DATA_UPDATE', this.handleCloudDataUpdate);
            this.props.vm.off('EXTENSION_ADDED', this.handleExtensionAdded);

            this.disconnectFromCloud();
        }
        canUseCloud (props) {
            return !!(
                props.storage.cloudVariables &&
                props.cloudHost &&
                props.username &&
                props.vm &&
                props.projectId &&
                props.hasCloudPermission
            );
        }
        shouldConnect (props) {
            return !this.isConnected() && this.canUseCloud(props) &&
                props.isShowingWithId && props.vm.runtime.hasCloudData() &&
                props.canModifyCloudData;
        }
        shouldDisconnect (props, prevProps) {
            return this.isConnected() &&
                ( // Can no longer use cloud or cloud provider info is now stale
                    !this.canUseCloud(props) ||
                    !props.vm.runtime.hasCloudData() ||
                    (props.projectId !== prevProps.projectId) ||
                    (props.username !== prevProps.username) ||
                    // Editing someone else's project
                    !props.canModifyCloudData
                );
        }
        isConnected () {
            return this.cloudProvider && this.cloudProvider.isConnectedOrConnecting();
        }
        connectToCloud () {
            // Clean up old connection if there was one
            this.disconnectFromCloud();

            if (!this.props.storage.cloudVariables) {
                return;
            }

            this.cloudProvider = this.props.storage.cloudVariables.createProvider(
                this.props.cloudHost,
                this.props.vm,
                this.props.username,
                this.props.projectId
            );

            this.props.vm.setCloudProvider(this.cloudProvider);
        }
        disconnectFromCloud () {
            if (this.cloudProvider) {
                this.cloudProvider.requestCloseConnection();
                this.cloudProvider = null;
                this.props.vm.setCloudProvider(null);
            }
        }
        handleCloudDataUpdate (projectHasCloudData) {
            if (this.isConnected() && !projectHasCloudData) {
                this.disconnectFromCloud();
            } else if (this.shouldConnect(this.props)) {
                this.props.onShowCloudInfo();
                this.connectToCloud();
            }
        }
        handleExtensionAdded (categoryInfo) {
            // Note that props.vm.extensionManager.isExtensionLoaded('videoSensing') is still false
            // at the point of this callback, so it is difficult to reuse the canModifyCloudData logic.
            if (
                (categoryInfo.id === 'videoSensing' ||
                    categoryInfo.id === 'faceSensing') &&
                this.isConnected()
            ) {
                this.disconnectFromCloud();
            }
        }
        render () {
            const {

                canModifyCloudData,
                cloudHost,
                projectId,
                hasCloudPermission,
                isShowingWithId,
                onShowCloudInfo,


                vm,

                // Intentionally propagating this one since it's used in MenuBar
                // username,

                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    canUseCloud={this.canUseCloud(this.props)}
                    vm={vm}
                    {...componentProps}
                />
            );
        }
    }

    CloudManager.propTypes = {
        storage: GUIStoragePropType,
        canModifyCloudData: PropTypes.bool.isRequired,
        cloudHost: PropTypes.string,
        hasCloudPermission: PropTypes.bool,
        isShowingWithId: PropTypes.bool.isRequired,
        onShowCloudInfo: PropTypes.func,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        username: PropTypes.string,
        vm: PropTypes.instanceOf(VM).isRequired
    };

    CloudManager.defaultProps = {
        cloudHost: null,
        hasCloudPermission: false,
        onShowCloudInfo: () => {},
        username: null
    };

    const mapStateToProps = (state, ownProps) => {
        const loadingState = state.scratchGui.projectState.loadingState;
        return {
            storage: state.scratchGui.config.storage,

            isShowingWithId: getIsShowingWithId(loadingState),
            projectId: state.scratchGui.projectState.projectId,
            // if you're editing someone else's project, you can't modify cloud data
            canModifyCloudData:
                (!state.scratchGui.mode.hasEverEnteredEditor ||
                    ownProps.canSave) &&
                // possible security concern if the program attempts to encode webcam data over cloud variables
                !(
                    ownProps.vm.extensionManager.isExtensionLoaded(
                        'videoSensing'
                    ) ||
                    ownProps.vm.extensionManager.isExtensionLoaded(
                        'faceSensing'
                    )
                )
        };
    };

    const mapDispatchToProps = dispatch => ({
        onShowCloudInfo: () => showAlertWithTimeout(dispatch, 'cloudInfo')
    });

    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );

    return connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(CloudManager);
};

export default cloudManagerHOC;
