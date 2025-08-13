import React from 'react';
import PropTypes from 'prop-types';
import {checkAuthentication} from './auth-utils';
import NoTokenView from '../components/auth/no-token-view';

/**
 * Higher Order Component that adds authentication checking to the GUI
 * @param {React.Component} WrappedComponent - The component to wrap with authentication
 * @returns {React.Component} The wrapped component with authentication
 */
const withAuthentication = (WrappedComponent) => {
    class AuthenticatedComponent extends React.Component {
        constructor(props) {
            super(props);
            // Check authentication immediately in constructor
            this.authResult = checkAuthentication();
            
            // If authenticated and we have analytics, identify the user
            if (this.authResult.isAuthenticated && this.authResult.accessToken) {
                this.identifyUserForAnalytics(this.authResult.accessToken);
            }
        }

        identifyUserForAnalytics = (accessToken) => {
            try {
                const userId = accessToken.encryptedUserId;
                if (userId && window.analytics) {
                    window.analytics.identify(userId);
                }
            } catch (error) {
                console.warn('Failed to identify user for analytics:', error);
            }
        };

        render() {
            // Show NoTokenView if not authenticated
            if (!this.authResult.isAuthenticated) {
                return <NoTokenView />;
            }

            // Render the wrapped component if authenticated
            return <WrappedComponent {...this.props} />;
        }
    }

    AuthenticatedComponent.propTypes = {
        ...WrappedComponent.propTypes
    };

    AuthenticatedComponent.displayName = `withAuthentication(${WrappedComponent.displayName || WrappedComponent.name})`;

    return AuthenticatedComponent;
};

export default withAuthentication;
