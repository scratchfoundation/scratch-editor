import React from 'react';
import styles from './menu-bar.css';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import fileIcon from './icon--file.svg';
import {useIntl, FormattedMessage, defineMessage} from 'react-intl';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import dropdownCaret from './dropdown-caret.svg';
import useMenuNavigation from '../../hooks/use-menu-navigation';

import sharedMessages from '../../lib/shared-messages';

import {saveProjectAsCopy} from '../../reducers/project-state';

const fileMenu = defineMessage({
    id: 'gui.aria.fileMenu',
    defaultMessage: 'File menu',
    description: 'accessibility label for file menu'
});

const FileMenu = ({
    isRtl,
    canSave,
    canCreateCopy,
    canRemix,
    onClickNew,
    onClickSave,
    onClickSaveAsCopy,
    onClickRemix,
    onStartSelectingFileUpload,
    getSaveToComputerHandler,
    remixMessage,
    depth
}) => {
    const intl = useIntl();

    const {
        menuRef,
        isExpanded,
        handleKeyDown,
        handleKeyDownOpenMenu,
        handleOnOpen,
        handleOnClose
    } = useMenuNavigation({
        depth,
        isRtl
    });

    const saveNowMessage = (
        <FormattedMessage
            defaultMessage="Save now"
            description="Menu bar item for saving now"
            id="gui.menuBar.saveNow"
        />
    );
    const createCopyMessage = (
        <FormattedMessage
            defaultMessage="Save as a copy"
            description="Menu bar item for saving as a copy"
            id="gui.menuBar.saveAsCopy"
        />
    );
    const newProjectMessage = (
        <FormattedMessage
            defaultMessage="New"
            description="Menu bar item for creating a new project"
            id="gui.menuBar.new"
        />
    );

    return (
        <button
            className={classNames(styles.menuBarItem, styles.hoverable, {
                [styles.active]: isExpanded()
            })}
            onClick={handleOnOpen}
            aria-label={intl.formatMessage(fileMenu)}
            aria-expanded={isExpanded()}
            ref={menuRef}
            onKeyDown={handleKeyDown}
        >
            <img src={fileIcon} />
            <span className={styles.collapsibleLabel}>
                <FormattedMessage
                    defaultMessage="File"
                    description="Text for file dropdown menu"
                    id="gui.menuBar.file"
                />
            </span>
            <img src={dropdownCaret} />
            <MenuBarMenu
                className={classNames(styles.menuBarMenu)}
                open={isExpanded()}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={handleOnClose}
            >
                <MenuSection>
                    <MenuItem
                        onClick={onClickNew}
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
                    >
                        {newProjectMessage}
                    </MenuItem>
                </MenuSection>
                {(canSave || canCreateCopy || canRemix) && (
                    <MenuSection>
                        {canSave && (
                            <MenuItem
                                onClick={onClickSave}
                                isDataMenuItem
                                onParentKeyDown={handleKeyDownOpenMenu}
                            >
                                {saveNowMessage}
                            </MenuItem>
                        )}
                        {canCreateCopy && (
                            <MenuItem
                                onClick={onClickSaveAsCopy}
                                isDataMenuItem
                                onParentKeyDown={handleKeyDownOpenMenu}
                            >
                                {createCopyMessage}
                            </MenuItem>
                        )}
                        {canRemix && (
                            <MenuItem
                                onClick={onClickRemix}
                                isDataMenuItem
                                onParentKeyDown={handleKeyDownOpenMenu}
                            >
                                {remixMessage}
                            </MenuItem>
                        )}
                    </MenuSection>
                )}
                <MenuSection>
                    <MenuItem
                        onClick={onStartSelectingFileUpload}
                        isDataMenuItem
                        onParentKeyDown={handleKeyDownOpenMenu}
                    >
                        {intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                    </MenuItem>
                    <SB3Downloader>{(className, downloadProjectCallback) => (
                        <MenuItem
                            className={className}
                            onClick={getSaveToComputerHandler(downloadProjectCallback)}
                            isDataMenuItem
                            onParentKeyDown={handleKeyDownOpenMenu}
                        >
                            <FormattedMessage
                                defaultMessage="Save to your computer"
                                description="Menu bar item for downloading a project to your computer" // eslint-disable-line @stylistic/max-len
                                id="gui.menuBar.downloadToComputer"
                            />
                        </MenuItem>
                    )}</SB3Downloader>
                </MenuSection>
            </MenuBarMenu>
        </button>
    );
};

FileMenu.propTypes = {
    isRtl: PropTypes.bool,
    canSave: PropTypes.bool.isRequired,
    canCreateCopy: PropTypes.bool.isRequired,
    canRemix: PropTypes.bool.isRequired,
    onStartSelectingFileUpload: PropTypes.func.isRequired,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickNew: PropTypes.func.isRequired,
    getSaveToComputerHandler: PropTypes.func.isRequired,
    remixMessage: PropTypes.node,
    depth: PropTypes.number
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

const mapDispatchToProps = dispatch => ({
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FileMenu);
