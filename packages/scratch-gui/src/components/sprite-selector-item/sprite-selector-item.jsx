import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useEffect} from 'react';
import DeleteButton from '../delete-button/delete-button.jsx';
import styles from './sprite-selector-item.css';
import contextMenuStyles from '../context-menu/context-menu.css';
import {DangerousMenuItem, MenuItem} from '../context-menu/context-menu.jsx';
import {FormattedMessage} from 'react-intl';
import ContextMenu from '../../lib/radix-ui-context-menu.js';

const SpriteSelectorItem = props => {
    useEffect(() => {
        const handleResize = () => {
            const contextMenu = document.querySelector('[data-radix-popper-content-wrapper]');
            if (contextMenu) {
                contextMenu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
            }
        };
    
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    

    return (
        <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger
                disabled={props.preventContextMenu}
                asChild
            >
                <div
                    className={classNames(props.className, styles.spriteSelectorItem, {
                        [styles.isSelected]: props.selected
                    })}
                    onClick={props.onClick}
                    onMouseEnter={props.onMouseEnter}
                    onMouseLeave={props.onMouseLeave}
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onMouseDown}
                    ref={props.componentRef}
                >
                    {typeof props.number === 'undefined' ? null : (
                        <div className={styles.number}>{props.number}</div>
                    )}
                    {props.costumeURL ? (
                        <div className={styles.spriteImageOuter}>
                            <div className={styles.spriteImageInner}>
                                <img
                                    className={styles.spriteImage}
                                    draggable={false}
                                    src={props.costumeURL}
                                />
                            </div>
                        </div>
                    ) : null}
                    <div className={styles.spriteInfo}>
                        <div className={styles.spriteName}>{props.name}</div>
                        {props.details ? (
                            <div className={styles.spriteDetails}>{props.details}</div>
                        ) : null}
                    </div>
                    {(props.selected && props.onDeleteButtonClick) ? (
                        <DeleteButton
                            className={styles.deleteButton}
                            isConfirmationModalOpened={props.isDeleteConfirmationModalOpened}
                            onClick={props.onDeleteButtonClick}
                        />
                    ) : null}
                </div>
            </ContextMenu.Trigger>
            {(props.onDuplicateButtonClick || props.onDeleteButtonClick || props.onExportButtonClick) && (
                <ContextMenu.Portal>
                    <ContextMenu.Content
                        className={contextMenuStyles.contextMenuContent}
                        collisionPadding={10}
                        sticky="always"
                    >
                        {props.onDuplicateButtonClick && (
                            <MenuItem onClick={props.onDuplicateButtonClick}>
                                <FormattedMessage
                                    defaultMessage="duplicate"
                                    description="Menu item to duplicate in the right click menu"
                                    id="gui.spriteSelectorItem.contextMenuDuplicate"
                                />
                            </MenuItem>
                        )}
                        {props.onExportButtonClick && (
                            <MenuItem onClick={props.onExportButtonClick}>
                                <FormattedMessage
                                    defaultMessage="export"
                                    description="Menu item to export the selected item"
                                    id="gui.spriteSelectorItem.contextMenuExport"
                                />
                            </MenuItem>
                        )}
                        {props.onDeleteButtonClick && (
                            <DangerousMenuItem onClick={props.onDeleteButtonClick}>
                                <FormattedMessage
                                    defaultMessage="delete"
                                    description="Menu item to delete in the right click menu"
                                    id="gui.spriteSelectorItem.contextMenuDelete"
                                />
                            </DangerousMenuItem>
                        )}
                    </ContextMenu.Content>
                </ContextMenu.Portal>
            )}
        </ContextMenu.Root>
    );
};

SpriteSelectorItem.propTypes = {
    className: PropTypes.string,
    componentRef: PropTypes.func,
    costumeURL: PropTypes.string,
    details: PropTypes.string,
    name: PropTypes.string.isRequired,
    number: PropTypes.number,
    onClick: PropTypes.func,
    onDeleteButtonClick: PropTypes.func,
    onDuplicateButtonClick: PropTypes.func,
    onExportButtonClick: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    preventContextMenu: PropTypes.bool,
    selected: PropTypes.bool.isRequired,
    isDeleteConfirmationModalOpened: PropTypes.bool
};

export default SpriteSelectorItem;
