import React from 'react';
import {Provider} from 'react-redux';
import PropTypes from 'prop-types';

import {EditorState} from './editor-state';
import {setPlayer, setFullScreen, setEmbedded} from '../reducers/mode.js';

/**
 * Wraps the editor into the redux state contained within an EditorState instance.
 * @param {React.Component} WrappedComponent - component to provide state for
 * @returns {React.Component} component with redux and intl state provided
 */
export const AppStateProviderHOC = function (WrappedComponent) {
    class AppStateWrapper extends React.Component {
        componentDidUpdate (prevProps) {
            if (this.props.localesOnly) return;
            if (prevProps.isPlayerOnly !== this.props.isPlayerOnly) {
                this.props.appState.store.dispatch(setPlayer(this.props.isPlayerOnly));
            }
            if (prevProps.isFullScreen !== this.props.isFullScreen) {
                this.props.appState.store.dispatch(setFullScreen(this.props.isFullScreen));
            }
            if (prevProps.isEmbedded !== this.props.isEmbedded) {
                this.props.appState.store.dispatch(setEmbedded(this.props.isEmbedded));
            }
        }

        render () {
            const {
                appState,
                isFullScreen,
                isPlayerOnly,
                showTelemetryModal,
                isEmbedded,
                ...componentProps
            } = this.props;
            return (
                <Provider store={appState.store}>
                    <WrappedComponent
                        {...componentProps}
                    />
                </Provider>
            );
        }
    }
    AppStateWrapper.propTypes = {
        appState: PropTypes.instanceOf(EditorState),
        localesOnly: PropTypes.bool,
        isFullScreen: PropTypes.bool,
        isPlayerOnly: PropTypes.bool,
        isTelemetryEnabled: PropTypes.bool,
        showTelemetryModal: PropTypes.bool,
        isEmbedded: PropTypes.bool
    };
    return AppStateWrapper;
};
