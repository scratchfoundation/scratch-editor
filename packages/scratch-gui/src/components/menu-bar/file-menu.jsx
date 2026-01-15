import React, {useRef} from 'react';
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
import useMenuNavigation from '../../hooks/use-menu-navigation.jsx';

import sharedMessages from '../../lib/shared-messages';
import propTypes from '../../lib/prop-types.js';

import {
    manualUpdateProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';

const fileMenu = defineMessage({
    id: 'gui.aria.fileMenu',
    defaultMessage: 'File menu',
    description: 'accessibility label for file menu'
});

const FileMenu = ({
    isRtl,
    menuRef,
    canSave,
    canCreateCopy,
    canRemix,
    onClickNew,
    onClickSave,
    onClickSaveAsCopy,
    onClickRemix,
    onStartSelectingFileUpload,
    getSaveToComputerHandler,
    remixMessage
}) => {
    const intl = useIntl();

    const newProjectRef = useRef(null);
    const saveRef = useRef(null);
    const createRef = useRef(null);
    const remixRef = useRef(null);
    const loadFromComputerRef = useRef(null);
    const saveToComputerRef = useRef(null);
    
    const itemRefs = [
        newProjectRef,
        ...(canSave ? [saveRef] : []),
        ...(canCreateCopy ? [createRef] : []),
        ...(canRemix ? [remixRef] : []),
        loadFromComputerRef,
        saveToComputerRef
    ];

    const {
        isExpanded,
        handleKeyPress,
        handleKeyPressOpenMenu,
        handleOnOpen,
        handleOnClose
    } = useMenuNavigation({
        menuRef,
        itemRefs,
        depth: 1
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
            onKeyDown={handleKeyPress}
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
                        isRtl={isRtl}
                        onClick={onClickNew}
                        itemRef={newProjectRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        {newProjectMessage}
                    </MenuItem>
                </MenuSection>
                {(canSave || canCreateCopy || canRemix) && (
                    <MenuSection>
                        {canSave && (
                            <MenuItem
                                onClick={onClickSave}
                                itemRef={saveRef}
                                onParentKeyPress={handleKeyPressOpenMenu}
                            >
                                {saveNowMessage}
                            </MenuItem>
                        )}
                        {canCreateCopy && (
                            <MenuItem
                                onClick={onClickSaveAsCopy}
                                itemRef={createRef}
                                onParentKeyPress={handleKeyPressOpenMenu}
                            >
                                {createCopyMessage}
                            </MenuItem>
                        )}
                        {canRemix && (
                            <MenuItem
                                onClick={onClickRemix}
                                itemRef={remixRef}
                                onParentKeyPress={handleKeyPressOpenMenu}
                            >
                                {remixMessage}
                            </MenuItem>
                        )}
                    </MenuSection>
                )}
                <MenuSection>
                    <MenuItem
                        onClick={onStartSelectingFileUpload}
                        itemRef={loadFromComputerRef}
                        onParentKeyPress={handleKeyPressOpenMenu}
                    >
                        {intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                    </MenuItem>
                    <SB3Downloader>{(className, downloadProjectCallback) => (
                        <MenuItem
                            className={className}
                            onClick={getSaveToComputerHandler(downloadProjectCallback)}
                            itemRef={saveToComputerRef}
                            onParentKeyPress={handleKeyPressOpenMenu}
                        >
                            <FormattedMessage
                                defaultMessage="Save to your computer"
                                description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
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
    menuRef: propTypes.ref.isRequired,
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
    remixMessage: PropTypes.node.isRequired
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

const mapDispatchToProps = dispatch => ({
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(FileMenu);
