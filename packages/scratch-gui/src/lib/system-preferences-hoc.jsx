import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {setColorMode} from '../reducers/settings';
import {detectColorMode} from './settings/color-mode/persistence';

// Dark mode is not yet supported
// const prefersDarkQuery = '(prefers-color-scheme: dark)';
const prefersHighContrastQuery = '(prefers-contrast: more)';

const systemPreferencesHOC = function (WrappedComponent) {
    class SystemPreferences extends React.Component {
        componentDidMount () {
            this.preferencesListener = () => this.props.onSetColorMode(detectColorMode());

            if (window.matchMedia) {
                this.highContrastMatchMedia = window.matchMedia(prefersHighContrastQuery);
                if (this.highContrastMatchMedia) {
                    if (this.highContrastMatchMedia.addEventListener) {
                        this.highContrastMatchMedia.addEventListener('change', this.preferencesListener);
                    } else {
                        this.highContrastMatchMedia.addListener(this.preferencesListener);
                    }
                }
            }
        }

        componentWillUnmount () {
            if (this.highContrastMatchMedia) {
                if (this.highContrastMatchMedia.removeEventListener) {
                    this.highContrastMatchMedia.removeEventListener('change', this.preferencesListener);
                } else {
                    this.highContrastMatchMedia.removeListener(this.preferencesListener);
                }
            }
        }

        render () {
            const {
                 
                onSetColorMode,
                 
                ...props
            } = this.props;
            return <WrappedComponent {...props} />;
        }
    }

    SystemPreferences.propTypes = {
        onSetColorMode: PropTypes.func
    };

    const mapDispatchToProps = dispatch => ({
        onSetColorMode: mode => dispatch(setColorMode(mode))
    });

    return connect(
        null,
        mapDispatchToProps
    )(SystemPreferences);
};

export default systemPreferencesHOC;
