import React, {useEffect, useCallback, useState, useRef} from 'react';
import classNames from 'classnames';
// eslint-disable-next-line import/no-unresolved
import {driver} from 'driver.js';
import 'driver.js/dist/driver.css';
import {defineMessages, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import {BLOCKS_TAB_INDEX} from '../../reducers/editor-tab';
import {getLocalStorageValue, setLocalStorageValue} from '../../lib/local-storage.js';
import addExtensionIcon from '../gui/icon--extensions.svg';
import styles from './extension-button.css';
import './extension-button.raw.css';

const messages = defineMessages({
    addExtension: {
        id: 'gui.gui.addExtension',
        description: 'Button to add an extension in the target pane',
        defaultMessage: 'Add Extension'
    },
    faceSensingCalloutTitle: {
        id: 'gui.gui.faceSensingCalloutTitle',
        description: 'Hey there! \u{1F44B}',
        defaultMessage: 'Hey there! \u{1F44B}'
    },
    faceSensingCalloutDescription: {
        id: 'gui.gui.faceSensingCalloutDescription',
        description: 'There is a new extension!',
        defaultMessage: 'There is a new extension!'
    }
});

const localStorageAvailable =
    'localStorage' in window && window.localStorage !== null;

// Default to true to make sure we don't end up showing the feature
// callouts multiple times if localStorage isn't available.
const hasIntroducedFaceSensing = (username = 'guest') => {
    if (!localStorageAvailable) return true;
    return getLocalStorageValue('hasIntroducedFaceSensing', username) === true;
};

const setHasIntroducedFaceSensing = (username = 'guest') => {
    if (!localStorageAvailable) return;
    setLocalStorageValue('hasIntroducedFaceSensing', username, true);
};

const hasUsedFaceSensing = (username = 'guest') => {
    if (!localStorageAvailable) return true;
    return getLocalStorageValue('hasUsedFaceSensing', username) === true;
};

const ExtensionButton = props => {
    const {
        activeTabIndex,
        intl,
        showNewFeatureCallouts,
        onExtensionButtonClick,
        username
    } = props;

    const driverRef = useRef(null);
    // Keep in a state to avoid reads from localStorage on every render.
    const [shouldShowFaceSensingCallouts, setShouldShowFaceSensingCallouts] =
        useState(showNewFeatureCallouts && !hasIntroducedFaceSensing(username) && !hasUsedFaceSensing(username));
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        if (!shouldShowFaceSensingCallouts) return;

        const onFirstClick = () => {
            const isExtensionButtonVisible = document.querySelector('div[class*="extension-button-container"]');
            if (!isExtensionButtonVisible) return;

            const tooltip = driver({
                allowClose: false,
                allowInteraction: true,
                overlayColor: 'transparent',
                popoverOffset: -3,
                steps: [{
                    element: 'div[class*="extension-button-container"]',
                    popover: {
                        title: intl.formatMessage(messages.faceSensingCalloutTitle),
                        description: intl.formatMessage(messages.faceSensingCalloutDescription),
                        side: 'right',
                        align: 'center',
                        popoverClass: 'tooltip-face-sensing',
                        showButtons: []
                    }
                }]
            });
            setClicked(true);
            driverRef.current = tooltip;
            tooltip.drive();
        };
        window.addEventListener('click', onFirstClick, {once: true});

        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
                driverRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!driverRef.current) return;

        if (!shouldShowFaceSensingCallouts && driverRef.current) {
            driverRef.current.destroy();
        }

        if (!shouldShowFaceSensingCallouts || !clicked) return;

        const isExtensionButtonVisible = document.querySelector('div[class*="extension-button-container"]');

        if (!isExtensionButtonVisible || activeTabIndex !== BLOCKS_TAB_INDEX) {
            driverRef.current.destroy();
        }

        if (isExtensionButtonVisible && activeTabIndex === BLOCKS_TAB_INDEX) {
            driverRef.current.drive();
        }
    }, [shouldShowFaceSensingCallouts, activeTabIndex, clicked]);

    const handleExtensionButtonClick = useCallback(() => {
        if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
        }

        if (shouldShowFaceSensingCallouts) {
            setHasIntroducedFaceSensing(username);
            setShouldShowFaceSensingCallouts(false);
        }
        onExtensionButtonClick?.();
    }, [shouldShowFaceSensingCallouts]);

    return (
        <Box className={styles.extensionButtonContainer}>
            <button
                className={
                    classNames(styles.extensionButton,
                        shouldShowFaceSensingCallouts && styles.radiate
                    )}
                title={intl.formatMessage(messages.addExtension)}
                onClick={handleExtensionButtonClick}
            >
                <img
                    className={styles.extensionButtonIcon}
                    draggable={false}
                    src={addExtensionIcon}
                />
            </button>
        </Box>
    );
};

ExtensionButton.propTypes = {
    activeTabIndex: PropTypes.number,
    intl: intlShape.isRequired,
    onExtensionButtonClick: PropTypes.func,
    showNewFeatureCallouts: PropTypes.bool,
    username: PropTypes.string
};

const ExtensionButtonIntl = injectIntl(ExtensionButton);

export default ExtensionButtonIntl;
