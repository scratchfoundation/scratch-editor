import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import VM from '@scratch/scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import ToggleButtons from '../toggle-buttons/toggle-buttons.jsx';
import Controls from '../../containers/controls.jsx';
import {getStageDimensions} from '../../lib/screen-utils';
import {STAGE_SIZE_MODES} from '../../lib/layout-constants';

import fullScreenIcon from './icon--fullscreen.svg';
import largeStageIcon from './icon--large-stage.svg';
import smallStageIcon from './icon--small-stage.svg';
import unFullScreenIcon from './icon--unfullscreen.svg';

import scratchLogo from '../menu-bar/scratch-logo.svg';
import styles from './stage-header.css';
import {storeProjectThumbnail} from '../../lib/store-project-thumbnail.js';
import dataURItoBlob from '../../lib/data-uri-to-blob.js';
import throttle from 'lodash.throttle';
import thumbnailIcon from './icon--thumbnail.svg';
import ConfirmationPrompt from '../confirmation-prompt/confirmation-prompt.jsx';
import FeatureCalloutPopover from '../feature-callout-popover/feature-callout-popover.jsx';
import classNames from 'classnames';
import {PopupAlign, PopupSide} from '../../lib/calculatePopupPosition.js';
import {getLocalStorageValue, setLocalStorageValue} from '../../lib/local-storage.js';

const LOCAL_STORAGE_KEY = 'hasIntroducedEditorManualSetThumbnail';

const messages = defineMessages({
    largeStageSizeMessage: {
        defaultMessage: 'Switch to large stage',
        description: 'Button to change stage size to large',
        id: 'gui.stageHeader.stageSizeLarge'
    },
    smallStageSizeMessage: {
        defaultMessage: 'Switch to small stage',
        description: 'Button to change stage size to small',
        id: 'gui.stageHeader.stageSizeSmall'
    },
    fullStageSizeMessage: {
        defaultMessage: 'Enter full screen mode',
        description: 'Button to change stage size to full screen',
        id: 'gui.stageHeader.stageSizeFull'
    },
    unFullStageSizeMessage: {
        defaultMessage: 'Exit full screen mode',
        description: 'Button to get out of full screen mode',
        id: 'gui.stageHeader.stageSizeUnFull'
    },
    setThumbnail: {
        defaultMessage: 'Set Thumbnail',
        description: 'Manually save project thumbnail',
        id: 'gui.stageHeader.saveThumbnail'
    },
    setThumbnailMessage: {
        defaultMessage: 'Are you sure you want to set your thumbnail?',
        description: 'Confirmation message for manually saving project thumbnail',
        id: 'gui.stageHeader.saveThumbnailMessage'
    },
    thumbnailTooltipTitle: {
        defaultMessage: 'Hey there! 👋',
        description: 'Title for the thumbnail tooltip',
        id: 'gui.stageHeader.thumbnailTooltipTitle'
    },
    thumbnailTooltipBody: {
        defaultMessage: '<b>"Set Thumbnail"</b> has a new spot. It works by ' +
            'taking a snapshot of your stage and setting it as your project thumbnail.',
        description: 'Body text for the thumbnail tooltip',
        id: 'gui.stageHeader.thumbnailTooltipBody'
    },
    fullscreenControl: {
        defaultMessage: 'Full Screen Control',
        description: 'Button to enter/exit full screen mode',
        id: 'gui.stageHeader.fullscreenControl'
    }
});

const StageHeaderComponent = function (props) {
    const {
        isFullScreen,
        isPlayerOnly,
        manuallySaveThumbnails,
        loadingOrCreating,
        onKeyPress,
        onSetStageLarge,
        onSetStageSmall,
        onSetStageFull,
        onSetStageUnFull,
        onUpdateProjectThumbnail,
        projectId,
        showBranding,
        showNewFeatureCallouts,
        stageSizeMode,
        vm,
        userOwnsProject,
        username,
        onShowSettingThumbnail,
        onShowThumbnailSuccess,
        onShowThumbnailError
    } = props;
    const intl = useIntl();

    let header = null;

    const thumbnailButtonRef = useRef(null);

    const [isThumbnailPromptOpen, setIsThumbnailPromptOpen] = useState(false);
    const [isThumbnailTooltipOpen, setIsThumbnailTooltipOpen] = useState(false);
    const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);

    const shouldShowThumbnailSaveButton = manuallySaveThumbnails && userOwnsProject;
    // TODO: Remove this callout after 60 days of manual thumbnail update release.
    const shouldShowCallout = shouldShowThumbnailSaveButton && showNewFeatureCallouts && !loadingOrCreating &&
        getLocalStorageValue(LOCAL_STORAGE_KEY, username ?? '') !== true;

    useEffect(() => {
        if (shouldShowCallout) {
            setIsThumbnailTooltipOpen(true);
        } else {
            setIsThumbnailTooltipOpen(false);
        }
    }, [shouldShowCallout]);

    const onUpdateThumbnail = useCallback(
        throttle(() => {
            if (!onUpdateProjectThumbnail) return;

            setIsUpdatingThumbnail(true);
            onShowSettingThumbnail();

            storeProjectThumbnail(vm, dataURI => {
                onUpdateProjectThumbnail(
                    projectId,
                    dataURItoBlob(dataURI),
                    () => {
                        onShowThumbnailSuccess();
                        setIsUpdatingThumbnail(false);
                    },
                    () => {
                        onShowThumbnailError();
                        setIsUpdatingThumbnail(false);
                    }
                );
            });
        }, 3000),
        [
            onUpdateProjectThumbnail,
            projectId,
            vm,
            onShowSettingThumbnail,
            onShowThumbnailSuccess,
            onShowThumbnailError
        ]
    );

    const onThumbnailPromptOpen = useCallback(() => {
        setIsThumbnailPromptOpen(true);
        try {
            setLocalStorageValue(LOCAL_STORAGE_KEY, username ?? '', true);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Unable to set thumbnail tooltip local storage value. Check if local storage is enabled.', e);
        }
        setIsThumbnailTooltipOpen(false);
    }, [username]);

    const onThumbnailPromptClose = useCallback(() => {
        setIsThumbnailPromptOpen(false);
    }, []);

    const onUpdateThumbnailAndClose = useCallback(() => {
        onThumbnailPromptClose();
        onUpdateThumbnail();
    }, [onUpdateThumbnail]);

    const onCloseTooltip = useCallback(() => {
        setIsThumbnailTooltipOpen(false);
    }, []);

    if (isFullScreen) {
        const stageDimensions = getStageDimensions(null, true);
        const stageButton = showBranding ? (
            <div className={styles.embedScratchLogo}>
                <a
                    href="https://scratch.mit.edu"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    <img
                        alt="Scratch"
                        src={scratchLogo}
                    />
                </a>
            </div>
        ) : (
            <div className={styles.unselectWrapper}>
                <Button
                    className={styles.stageButton}
                    onClick={onSetStageUnFull}
                    onKeyPress={onKeyPress}
                >
                    <img
                        alt={intl.formatMessage(messages.unFullStageSizeMessage)}
                        className={styles.stageButtonIcon}
                        draggable={false}
                        src={unFullScreenIcon}
                        title={intl.formatMessage(messages.fullscreenControl)}
                    />
                </Button>
            </div>
        );
        header = (
            <Box className={styles.stageHeaderWrapperOverlay}>
                <Box
                    className={styles.stageMenuWrapper}
                    style={{width: stageDimensions.width}}
                >
                    <Controls vm={vm} />
                    {stageButton}
                </Box>
            </Box>
        );
    } else {
        const stageControls =
            isPlayerOnly ? (
                []
            ) : (
                <ToggleButtons
                    buttons={[
                        {
                            handleClick: onSetStageSmall,
                            icon: smallStageIcon,
                            iconClassName: styles.stageButtonIcon,
                            isSelected: stageSizeMode === STAGE_SIZE_MODES.small,
                            title: intl.formatMessage(messages.smallStageSizeMessage)
                        },
                        {
                            handleClick: onSetStageLarge,
                            icon: largeStageIcon,
                            iconClassName: styles.stageButtonIcon,
                            isSelected: stageSizeMode === STAGE_SIZE_MODES.large,
                            title: intl.formatMessage(messages.largeStageSizeMessage)
                        }
                    ]}
                />
            );
        header = (
            <Box className={styles.stageHeaderWrapper}>
                <Box className={styles.stageMenuWrapper}>
                    <Controls vm={vm} />
                    <div className={styles.stageSizeRow}>
                        <FeatureCalloutPopover
                            isOpen={isThumbnailTooltipOpen}
                            onRequestClose={onCloseTooltip}
                            targetRef={thumbnailButtonRef}
                            side={PopupSide.LEFT}
                            align={PopupAlign.DOWN}
                            title={intl.formatMessage(messages.thumbnailTooltipTitle)}
                            body={
                                <FormattedMessage
                                    {...messages.thumbnailTooltipBody}
                                    values={{
                                        b: chunks => <b>{chunks}</b>
                                    }}
                                />
                            }
                        />
                        {shouldShowThumbnailSaveButton && (
                            <Button
                                title={intl.formatMessage(messages.setThumbnail)}
                                className={classNames(
                                    styles.stageButton,
                                    {[styles.stageButtonHighlighted]: isThumbnailTooltipOpen}
                                )}
                                onClick={onThumbnailPromptOpen}
                                disabled={isUpdatingThumbnail}
                                componentRef={thumbnailButtonRef}
                            >
                                <img
                                    src={thumbnailIcon}
                                    alt={intl.formatMessage(messages.setThumbnail)}
                                    className={styles.stageButtonIcon}
                                />
                            </Button>
                        )}
                        <ConfirmationPrompt
                            isOpen={isThumbnailPromptOpen}
                            title={intl.formatMessage(messages.setThumbnail)}
                            message={intl.formatMessage(messages.setThumbnailMessage)}
                            confirmButtonConfig={{onClick: onUpdateThumbnailAndClose}}
                            cancelButtonConfig={{onClick: onThumbnailPromptClose}}
                            relativeElementRef={thumbnailButtonRef}
                            side={PopupSide.DOWN}
                            align={PopupAlign.LEFT}
                        />
                        {stageControls}
                        <div className={styles.rightSection}>
                            <Button
                                className={styles.stageButton}
                                onClick={onSetStageFull}
                            >
                                <img
                                    alt={intl.formatMessage(messages.fullStageSizeMessage)}
                                    className={styles.stageButtonIcon}
                                    draggable={false}
                                    src={fullScreenIcon}
                                    title={intl.formatMessage(messages.fullscreenControl)}
                                />
                            </Button>
                        </div>
                    </div>
                </Box>
            </Box>
        );
    }

    return header;
};

StageHeaderComponent.propTypes = {
    isFullScreen: PropTypes.bool.isRequired,
    isPlayerOnly: PropTypes.bool.isRequired,
    manuallySaveThumbnails: PropTypes.bool,
    loadingOrCreating: PropTypes.bool,
    onKeyPress: PropTypes.func.isRequired,
    onSetStageFull: PropTypes.func.isRequired,
    onSetStageLarge: PropTypes.func.isRequired,
    onSetStageSmall: PropTypes.func.isRequired,
    onSetStageUnFull: PropTypes.func.isRequired,
    onUpdateProjectThumbnail: PropTypes.func,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    showBranding: PropTypes.bool.isRequired,
    showNewFeatureCallouts: PropTypes.bool,
    stageSizeMode: PropTypes.oneOf(Object.keys(STAGE_SIZE_MODES)),
    vm: PropTypes.instanceOf(VM).isRequired,
    userOwnsProject: PropTypes.bool,
    username: PropTypes.string,
    onShowSettingThumbnail: PropTypes.func,
    onShowThumbnailError: PropTypes.func,
    onShowThumbnailSuccess: PropTypes.func
};

StageHeaderComponent.defaultProps = {
    stageSizeMode: STAGE_SIZE_MODES.large,
    userOwnsProject: false
};

export default StageHeaderComponent;
