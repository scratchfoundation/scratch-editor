import React from 'react';
import {Provider} from 'react-redux';
import PropTypes from 'prop-types';

import {EditorState} from './editor-state';
import {setPlayer, setFullScreen} from '../reducers/mode.js';
import ConnectedIntlProvider from './connected-intl-provider.jsx';

/**
 * Wraps the editor into the redux state contained within an EditorState instance.
 *
 * @param {React.Component} WrappedComponent - component to provide state for
 *
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
        }

        render () {
            const {
                appState,
                isFullScreen, // eslint-disable-line no-unused-vars
                isPlayerOnly, // eslint-disable-line no-unused-vars
                showTelemetryModal, // eslint-disable-line no-unused-vars
                ...componentProps
            } = this.props;
            return (
                <Provider store={appState.store}>
                    <ConnectedIntlProvider>
                        <WrappedComponent
                            {...componentProps}
                        />
                    </ConnectedIntlProvider>
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
        showTelemetryModal: PropTypes.bool
    };
    return AppStateWrapper;
};
