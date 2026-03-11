import React, {useState, useCallback, useEffect} from 'react';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import classNames from 'classnames';
import {sections} from './sections/sections';
import GA4 from '../../lib/analytics';

import styles from './debug-modal.css';
import debugIcon from './icons/icon--debug.svg';
import debugIconInverted from './icons/icon--debug-inverted.svg';
import closeIcon from './icons/icon--close.svg';
import prevIcon from './icons/icon--prev.svg';
import nextIcon from './icons/icon--next.svg';
import {KEY} from '../../lib/navigation-keys';

const messages = defineMessages({
    title: {
        id: 'gui.debugModal.title',
        defaultMessage: 'Debugging | Getting Unstuck',
        description: 'title for the debugging modal'
    },
    previous: {
        id: 'gui.debugModal.previous',
        defaultMessage: 'Previous',
        description: 'Button to go to previous debugging topic'
    },
    next: {
        id: 'gui.debugModal.next',
        defaultMessage: 'Next',
        description: 'Button to go to next debugging topic'
    }
});

const logTopicChange = topicIndex => {
    GA4.event({
        category: 'change_topic_debug_modal',
        label: sections[topicIndex].id
    });
};

const DebugModal = ({isOpen, onClose = () => {}}) => {
    const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

    // Preload images
    useEffect(() => {
        sections.forEach(section => {
            new Image().src = section.image;
        });
    }, []);

    const handleNext = useCallback(() => {
        if (selectedTopicIndex < sections.length - 1) {
            setSelectedTopicIndex(selectedTopicIndex + 1);
            logTopicChange(selectedTopicIndex + 1);
        }
    }, [selectedTopicIndex, setSelectedTopicIndex]);

    const handlePrevious = useCallback(() => {
        if (selectedTopicIndex > 0) {
            setSelectedTopicIndex(selectedTopicIndex - 1);
            logTopicChange(selectedTopicIndex - 1);
        }
    }, [selectedTopicIndex, setSelectedTopicIndex]);

    const handleTopicSelect = useCallback(index => {
        setSelectedTopicIndex(index);
        logTopicChange(index);
    }, [setSelectedTopicIndex]);

    const handleClose = useCallback(() => {
        GA4.event({
            category: 'close_debug_modal'
        });
        onClose();
    }, [onClose]);

    const handleKeyDownSlides = useCallback(e => {
        if ([KEY.ARROW_LEFT, KEY.ARROW_UP, KEY.ARROW_RIGHT, KEY.ARROW_DOWN].includes(e.key)) {
            e.preventDefault();

            setSelectedTopicIndex(prev => {
                let nextIndex = prev;

                if ((e.key === KEY.ARROW_LEFT || e.key === KEY.ARROW_UP) && prev > 0) {
                    nextIndex = prev - 1;
                } else if ((e.key === KEY.ARROW_RIGHT || e.key === KEY.ARROW_DOWN) &&
                    prev < sections.length - 1) {
                    nextIndex = prev + 1;
                }

                if (nextIndex !== prev) {
                    logTopicChange(nextIndex);
                }

                return nextIndex;
            });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDownSlides);
        return () => document.removeEventListener('keydown', handleKeyDownSlides);
    }, [isOpen, handleKeyDownSlides]);

    useEffect(() => {
        if (isOpen) {
            GA4.event({
                category: 'open_debug_modal',
                label: sections[selectedTopicIndex].id
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const intl = useIntl();

    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={handleClose}
            className={styles.debugModalContainer}
            overlayClassName={styles.debugModalOverlay}
        >
            <div className={styles.modalHeader}>
                <div className={styles.headerTitle}>
                    <img
                        className={styles.debugIcon}
                        src={debugIcon}
                    />
                    <FormattedMessage
                        {...messages.title}
                    />
                </div>
                <button
                    className={styles.closeButton}
                    onClick={handleClose}
                >
                    <img
                        className={styles.closeIcon}
                        src={closeIcon}
                    />
                </button>
            </div>
            <div className={styles.modalContent} >
                <div className={styles.topicList}>
                    {sections.map((section, index) => (
                        <button
                            key={index}
                            className={classNames(styles.topicItem, styles.buttonStyleRemover,
                                {
                                    [styles.active]: selectedTopicIndex === index
                                })}
                            // eslint-disable-next-line react/jsx-no-bind
                            onClick={() => handleTopicSelect(index)}
                            tabIndex={-1}
                        >
                            <div className={styles.debugIcon}>
                                <img
                                    className={classNames({
                                        [styles.hidden]: selectedTopicIndex !== index
                                    })}
                                    src={debugIconInverted}
                                />
                            </div>
                            <FormattedMessage
                                {...(section.sectionTitle ?? section.title)}
                            />
                        </button>
                    ))}
                </div>
                <div className={styles.infoContainer}>
                    <div className={styles.textContainer}>
                        <div className={styles.titleText}>
                            <FormattedMessage
                                {...sections[selectedTopicIndex].title}
                            />
                        </div>
                        <div className={styles.description}>{sections[selectedTopicIndex].description}</div>
                    </div>
                    <div className={styles.imageContainer}>
                        <img
                            src={sections[selectedTopicIndex].image}
                            className={styles.topicImage}
                        />
                    </div>
                    <div className={styles.navigationButtons}>
                        <button
                            onClick={handlePrevious}
                            className={classNames(styles.buttonStyleRemover,
                                styles.previousIcon,
                                {[styles.hidden]: selectedTopicIndex === 0})}
                        >
                            <img
                                src={prevIcon}
                                alt={intl.formatMessage(messages.previous)}
                            />
                        </button>
                        <button
                            onClick={handleNext}
                            className={classNames(styles.nextIcon,
                                styles.buttonStyleRemover,
                                {
                                    [styles.hidden]: selectedTopicIndex === sections.length - 1
                                })}
                        >
                            <img
                                src={nextIcon}
                                alt={intl.formatMessage(messages.next)}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </ReactModal>
    );
};

DebugModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};

export default DebugModal;
