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
    const [isExpanded, setIsExpanded] = useState(false);

    const closeTimeoutRef = useRef(null);
    const mainTooltipId = useRef(`tooltip-${Math.random()}`).current;
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const itemRefs = useRef([]);

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

    // Handle clicks/touches outside to close menu
    useEffect(() => {
        const handleTouchOutside = e => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsExpanded(false);
                ReactTooltip.hide();
            }
        };

        document.addEventListener('touchstart', handleTouchOutside);
        return () => {
            document.removeEventListener('touchstart', handleTouchOutside);
        };
    }, [containerRef, setIsExpanded]);

    const focusItem = useCallback(item => {
        if (item) {
            item.focus();
        }
    }, []);

    const handleMove = useCallback(direction => {
        const items = itemRefs.current;
        if (!items.length) return;

        if (!items.includes(document.activeElement)) {
            focusItem(direction === 1 ? items[0] : items[items.length - 1]);
            return;
        }

        const currentIndex = items.indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + items.length) % items.length;
        focusItem(items[nextIndex]);
    }, [itemRefs, focusItem]);

    const handleKeyDown = useCallback(e => {
        if (e.key === KEY.ARROW_DOWN || e.key === KEY.ARROW_UP) {
            e.preventDefault();
            if (!isExpanded) {
                setIsExpanded(true);
            }
            const direction = e.key === KEY.ARROW_UP ? -1 : 1;
            handleMove(direction);
        } else if (e.key === KEY.TAB || e.key === KEY.ESCAPE) {
            setIsExpanded(false);
            focusItem(buttonRef.current);
        }
    }, [handleMove, isExpanded, setIsExpanded]);

    const handleClosePopover = useCallback(() => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            closeTimeoutRef.current = null;
        }, CLOSE_DELAY);
    }, []);

    useEffect(() => {
        const items = itemRefs.current;
        const currentFocusedIndex = items.indexOf(document.activeElement);
        if (isExpanded && items.length) {
            const timer = setTimeout(() => {
                // blur and refocus in order to recalculate tooltip position upon expansion
                if (items[currentFocusedIndex]) {
                    items[currentFocusedIndex].blur();
                    focusItem(items[currentFocusedIndex]);
                }
            }, CLOSE_DELAY);
            return () => clearTimeout(timer);
        }
    }, [isExpanded, focusItem, itemRefs.current.length]);

    useEffect(() => {
        if (!isExpanded) {
            ReactTooltip.hide();
        }
    }, [isExpanded]);

    const clickEvent = useCallback(
        fn => (event => {
            if (fn) fn(event);
        }), []
    );

    const handleItemMouseEnter = useCallback(index => () => {
        const items = itemRefs.current;
        const currentFocusedIndex = items.indexOf(document.activeElement);
        if (currentFocusedIndex === index) return;
        
        if (items[currentFocusedIndex]) {
            items[currentFocusedIndex].blur();
        }
        if (items[index]) {
            focusItem(items[index]);
        }
    }, [focusItem]);

    return (
        <div
            className={classNames(styles.menuContainer, className, {
                [styles.expanded]: isExpanded,
                [styles.forceHidden]: forceHide
            })}
            onMouseEnter={handleToggleOpenState}
            onMouseLeave={handleClosePopover}
            onKeyDown={handleKeyDown}
            onFocus={handleToggleOpenState}
            onBlur={handleClosePopover}
            ref={containerRef}
        >
            <button
                aria-label={mainTitle}
                className={classNames(styles.button, styles.mainButton)}
                data-for={mainTooltipId}
                data-tip={mainTitle}
                onClick={clickEvent(onClick)}
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
                                <li key={`${tooltipId}-${keyId}`}>
                                    <button
                                        aria-label={title}
                                        className={classNames(styles.button, styles.moreButton, {
                                            [styles.comingSoon]: isComingSoon
                                        })}
                                        data-for={tooltipId}
                                        data-tip={title}
                                        onClick={hasFileInput ? handleClick : clickEvent(handleClick)}
                                        tabIndex={-1}
                                        ref={el => {
                                            itemRefs.current[keyId] = el;
                                        }}
                                        onMouseEnter={handleItemMouseEnter(keyId)}
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

export default React.memo(ActionMenu, (prevProps, nextProps) =>
    // This check prevents re-rendering while the project is updating.
    // This is needed because of the sloppy way the props are passed as a new object,
    // which should be refactored.
    // Only re-render if the title changes
    prevProps.title === nextProps.title
);
