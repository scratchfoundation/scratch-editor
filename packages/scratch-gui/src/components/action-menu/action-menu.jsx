import React, {useState, useRef, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import ReactTooltip from 'react-tooltip';
import styles from './action-menu.css';
import {KEY} from '../../lib/navigation-keys';

const CLOSE_DELAY = 300; // ms

const ActionMenu = ({
    className,
    img: mainImg,
    title: mainTitle,
    moreButtons,
    tooltipPlace,
    onClick
}) => {
    const [forceHide, setForceHide] = useState(false);

    const closeTimeoutRef = useRef(null);
    const mainTooltipId = useRef(`tooltip-${Math.random()}`).current;

    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const skipNextBlurRef = useRef(false);
    const itemRefs = useRef([]);

    useEffect(() => {
        if (!isExpanded) {
            if (skipNextBlurRef.current) {
                // Skip the blur this time
                skipNextBlurRef.current = false;
                return;
            }
            // If menu is closed, blur any focused element to prevent keyboard events from affecting it
            if (document.activeElement !== document.body) {
                document.activeElement.blur();
            }
            
            buttonRef?.current?.blur();
        }
    }, [isExpanded, buttonRef, skipNextBlurRef]);

    // Handle clicks/touches outside to close menu
    useEffect(() => {
        const handleTouchOutside = e => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsExpanded(false);
                ReactTooltip.hide();
            }
        };

        document.addEventListener('mousedown', handleTouchOutside);
        return () => {
            document.removeEventListener('mousedown', handleTouchOutside);
        };
    }, [containerRef, setIsExpanded]);

    const focusItem = useCallback(item => {
        if (item) {
            item.focus();
        }
    }, []);

    const handleOnFocus = useCallback(() => {
        setIsExpanded(true);
        const items = itemRefs.current;
        if (!items.length) return;

        // default to last item (first above)
        const defaultItem = items[items.length - 1];
        focusItem(defaultItem);
        // TODO: refresh tooltip so it repositions correctly
    }, [itemRefs, focusItem, setIsExpanded]);

    const handleMove = useCallback(direction => {
        const items = itemRefs.current;
        if (!items.length) return;

        const currentIndex = items.indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        focusItem(items[nextIndex]);
    }, [itemRefs, focusItem]);

    const handleKeyDown = useCallback(e => {
        switch (e.key) {
        case KEY.ARROW_DOWN:
            e.preventDefault();
            handleMove(1);
            break;
        case KEY.ARROW_UP:
            e.preventDefault();
            handleMove(-1);
            break;
        case KEY.TAB:
            setIsExpanded(false);
            // A little bit hacky logic for shift + tab to move focus to previous element
            if (e.shiftKey) {
                e.preventDefault();
                const focusables = Array.from(
                    document.querySelectorAll('a, button, input, select, textarea, [tabindex]')
                );

                const filteredFocusables = focusables.filter(el => {
                    // Skip disabled, hidden, or tabindex=-1
                    if (el.disabled) return false;
                    if (el.offsetParent === null) return false;
                    const tabindex = el.getAttribute('tabindex');
                    if (tabindex === '-1') return false;
                    return true;
                });
                const currentIndex = filteredFocusables.indexOf(buttonRef.current);
                if (currentIndex > 0) {
                    filteredFocusables[currentIndex - 1].focus();
                }

                skipNextBlurRef.current = true;
            }
            return;
        }
    }, [handleMove, isExpanded, setIsExpanded]);

    const handleClosePopover = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            closeTimeoutRef.current = null;
        }, CLOSE_DELAY);
    }, []);

    const handleToggleOpenState = useCallback(() => {
        // Mouse enter back in after timeout was started prevents it from closing.
        
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        } else if (!isExpanded) {
            setIsExpanded(true);
            setForceHide(false);
        }
    }, [isExpanded]);

    const clickDelayer = useCallback(
        // Return a wrapped action that manages the menu closing.
        // @todo we may be able to use react-transition for this in the future
        // for now all this work is to ensure the menu closes BEFORE the
        // (possibly slow) action is started.
        fn => (event => {
            ReactTooltip.hide();
            if (fn) fn(event);
            // Blur the button so it does not keep focus after being clicked
            // This prevents keyboard events from triggering the button
            buttonRef.current?.blur();
            setForceHide(true);
            setIsExpanded(false);
            setTimeout(() => setForceHide(false), 0);
        }),
        []
    );

    const handleTouchStart = useCallback(e => {
    // Prevent this touch from becoming a click if menu is closed
        if (!isExpanded) {
            e.preventDefault();
            handleToggleOpenState();
        }
    }, [isExpanded, handleToggleOpenState]);
    
    useEffect(() => {
        const buttonEl = buttonRef.current;
        if (!buttonEl) return;

        buttonEl.addEventListener('touchstart', handleTouchStart);
        return () => {
            buttonEl.removeEventListener('touchstart', handleTouchStart);
        };
    }, [handleTouchStart]);

    return (
        <div
            className={classNames(styles.menuContainer, className, {
                [styles.expanded]: isExpanded,
                [styles.forceHidden]: forceHide
            })}
            onMouseEnter={handleToggleOpenState}
            onMouseLeave={handleClosePopover}
            ref={containerRef}
        >
            <button
                aria-label={mainTitle}
                className={classNames(styles.button, styles.mainButton)}
                data-for={mainTooltipId}
                data-tip={mainTitle}
                onFocus={handleOnFocus}
                onClick={clickDelayer(onClick)}
                ref={buttonRef}
            >
                <img
                    className={styles.mainIcon}
                    draggable={false}
                    src={mainImg}
                />
            </button>
            <ReactTooltip
                className={styles.tooltip}
                effect="solid"
                id={mainTooltipId}
                place={tooltipPlace || 'left'}
                arrowColor="var(--tooltip-arrow-color)"
            />
            <div className={styles.moreButtonsOuter}>
                <ul className={styles.moreButtons}>
                    {(moreButtons || []).map(
                        (
                            {
                                img,
                                title,
                                onClick: handleClick,
                                fileAccept,
                                fileChange,
                                fileInput,
                                fileMultiple
                            },
                            keyId
                        ) => {
                            const isComingSoon = !handleClick;
                            const hasFileInput = fileInput;
                            const tooltipId = `${mainTooltipId}-${title}`;
                            return (
                                <li
                                    key={`${tooltipId}-${keyId}`}
                                    tabIndex={-1}
                                >
                                    <button
                                        aria-label={title}
                                        className={classNames(styles.button, styles.moreButton, {
                                            [styles.comingSoon]: isComingSoon
                                        })}
                                        data-for={tooltipId}
                                        data-tip={title}
                                        onClick={hasFileInput ? handleClick : clickDelayer(handleClick)}
                                        tabIndex={-1}
                                        onKeyDown={handleKeyDown}
                                        ref={el => {
                                            itemRefs.current[keyId] = el;
                                        }}
                                    >
                                        <img
                                            className={styles.moreIcon}
                                            draggable={false}
                                            src={img}
                                        />
                                        {hasFileInput ? (
                                            <input
                                                accept={fileAccept}
                                                className={styles.fileInput}
                                                multiple={fileMultiple}
                                                ref={fileInput}
                                                type="file"
                                                onChange={fileChange}
                                            />) : null}
                                    </button>
                                    <ReactTooltip
                                        className={classNames(styles.tooltip, {
                                            [styles.comingSoonTooltip]: isComingSoon
                                        })}
                                        effect="solid"
                                        id={tooltipId}
                                        place={tooltipPlace || 'left'}
                                        arrowColor="var(--tooltip-arrow-color)"
                                    />
                                </li>
                            );
                        }
                    )}
                </ul>
            </div>
        </div>
    );
};

ActionMenu.propTypes = {
    className: PropTypes.string,
    img: PropTypes.string,
    moreButtons: PropTypes.arrayOf(
        PropTypes.shape({
            img: PropTypes.string,
            title: PropTypes.node.isRequired,
            onClick: PropTypes.func, // Optional, "coming soon" if no callback provided
            fileAccept: PropTypes.string, // Optional, only for file upload
            fileChange: PropTypes.func, // Optional, only for file upload
            fileInput: PropTypes.func, // Optional, only for file upload
            fileMultiple: PropTypes.bool // Optional, only for file upload
        })
    ),
    onClick: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired,
    tooltipPlace: PropTypes.string
};

export default ActionMenu;
