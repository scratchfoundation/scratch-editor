import React from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

import styles from './no-token-view.css';

const NoTokenView = () => (
    <div className={styles.noTokenContainer}>
        <div className={styles.noTokenContent}>
            <h2 className={styles.noTokenTitle}>
                <FormattedMessage
                    defaultMessage="Oops"
                    description="Title for authentication error page"
                    id="gui.auth.noToken.title"
                />
            </h2>
            <div className={styles.noTokenMessage}>
                <FormattedMessage
                    defaultMessage="Sorry, we didn't find a valid authentication token or your token is expired"
                    description="Message explaining authentication failure"
                    id="gui.auth.noToken.message"
                />
            </div>
        </div>
    </div>
);

NoTokenView.propTypes = {};

export default NoTokenView;
