import React from 'react';
import PropTypes from 'prop-types';

import {EditorState} from './editor-state';
import {AppStateProviderHOC} from './app-state-provider-hoc';

/**
 * Higher Order Component to provide redux state. If an `intl` prop is provided
 * it will override the internal `intl` redux state
 *
 * @param {React.Component} WrappedComponent - component to provide state for
 * @param {boolean} localesOnly - only provide the locale state, not everything
 *                      required by the GUI. Used to exclude excess state when
 *                      only rendering modals, not the GUI.
 * @param {GUIConfigFactory} configFactory - The configuration to use.
 *
 * @returns {React.Component} component with redux and intl state provided
 */
const AppStateHOC = function (WrappedComponent, localesOnly, configFactory) {
    const AppStateProvider = AppStateProviderHOC(WrappedComponent);

    class AppStateWrapper extends React.Component {
        constructor (props) {
            super(props);

            this.appState = new EditorState({
                localesOnly,
                isFullScreen: props.isFullScreen,
                isPlayerOnly: props.isPlayerOnly,
                showTelemetryModal: props.showTelemetryModal
            }, configFactory);
        }

        render () {
            return (
                <AppStateProvider
                    appState={this.appState}
                    localesOnly={localesOnly}
                    {...this.props}
                />
            );
        }
    }
    AppStateWrapper.propTypes = {
        isFullScreen: PropTypes.bool,
        isPlayerOnly: PropTypes.bool,
        isTelemetryEnabled: PropTypes.bool,
        showTelemetryModal: PropTypes.bool
    };
    return AppStateWrapper;
};

export default AppStateHOC;
