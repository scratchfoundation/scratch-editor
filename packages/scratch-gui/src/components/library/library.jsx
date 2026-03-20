import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import intlShape from '../../lib/intlShape.js';

import LibraryItem from '../../containers/library-item.jsx';
import Modal from '../../containers/modal.jsx';
import Divider from '../divider/divider.jsx';
import Filter from '../filter/filter.jsx';
import TagButton from '../../containers/tag-button.jsx';
import {legacyConfig} from '../../legacy-config';
import Spinner from '../spinner/spinner.jsx';
import {CATEGORIES} from '../../../src/lib/libraries/decks/index.jsx';

import styles from './library.css';
import {ModalFocusContext} from '../../contexts/modal-focus-context.jsx';

const messages = defineMessages({
    filterPlaceholder: {
        id: 'gui.library.filterPlaceholder',
        defaultMessage: 'Search',
        description: 'Placeholder text for library search field'
    },
    allTag: {
        id: 'gui.library.allTag',
        defaultMessage: 'All',
        description: 'Label for library tag to revert to all items after filtering by tag.'
    },
    // Strings here need to be defined statically
    // https://formatjs.io/docs/getting-started/message-declaration/#pre-declaring-using-definemessage-for-later-consumption-less-recommended
    [CATEGORIES.gettingStarted]: {
        id: `gui.library.gettingStarted`,
        defaultMessage: 'Getting Started',
        description: 'Label for getting started category'
    },
    [CATEGORIES.basics]: {
        id: `gui.library.basics`,
        defaultMessage: 'Basics',
        description: 'Label for basics category'
    },
    [CATEGORIES.intermediate]: {
        id: `gui.library.intermediate`,
        defaultMessage: 'Intermediate',
        description: 'Label for intermediate category'
    },
    [CATEGORIES.prompts]: {
        id: `gui.library.prompts`,
        defaultMessage: 'Prompts',
        description: 'Label for prompts category'
    },
    membershipTag: {
        defaultMessage: 'Membership',
        description: 'Tag for filtering a library for member only assets',
        id: 'gui.library.membershipTag'
    }
});

const ALL_TAG = {tag: 'all', intlLabel: messages.allTag};
const tagListPrefix = [ALL_TAG];

// Membership tag manually added to the tag list if any member-only assets are present.
// Member-only assets are displayed as a separate tag to allow users to filter by them.
const MEMBERSHIP_TAG = {tag: 'membership', intlLabel: messages.membershipTag};

/**
 * Find the AssetType which corresponds to a particular file extension. For example, 'png' => AssetType.ImageBitmap.
 * @param {string} fileExtension - the file extension to look up.
 * @returns {AssetType} - the AssetType corresponding to the extension, if any.
 */
const getAssetTypeForFileExtension = function (fileExtension) {
    const compareOptions = {
        sensitivity: 'accent',
        usage: 'search'
    };
    const storage = legacyConfig.storage.scratchStorage;
    for (const assetTypeId in storage.AssetType) {
        const assetType = storage.AssetType[assetTypeId];
        if (fileExtension.localeCompare(assetType.runtimeFormat, compareOptions) === 0) {
            return assetType;
        }
    }
};

/**
 * Figure out one or more icon(s) for a library item.
 * If it's an animated thumbnail, this will return an array of `imageSource`.
 * Otherwise it'll return just one `imageSource`.
 * @param {object} item - either a library item or one of a library item's costumes.
 *   The latter is used internally as part of processing an animated thumbnail.
 * @returns {LibraryItem.PropTypes.icons} - an `imageSource` or array of them
 */
const getItemIcons = function (item) {
    const costumes = (item.json && item.json.costumes) || item.costumes;
    if (costumes) {
        return costumes.map(getItemIcons);
    }

    if (item.rawURL) {
        return {
            uri: item.rawURL
        };
    }

    if (item.assetId && item.dataFormat) {
        return {
            assetId: item.assetId,
            assetType: getAssetTypeForFileExtension(item.dataFormat),
            assetServiceUri: `https://cdn.assets.scratch.mit.edu/internalapi/asset/${item.assetId}.${item.dataFormat}/get/`
        };
    }

    const md5ext = item.md5ext || item.md5 || item.baseLayerMD5;
    if (md5ext) {
        const [assetId, fileExtension] = md5ext.split('.');
        return {
            assetId: assetId,
            assetType: getAssetTypeForFileExtension(fileExtension),
            assetServiceUri: `https://cdn.assets.scratch.mit.edu/internalapi/asset/${md5ext}/get/`
        };
    }
};

const getMemberOnlyTags = data => (data && data.some(item => item.isMemberOnly) ? [MEMBERSHIP_TAG] : []);

class LibraryComponent extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClose',
            'handleFilterChange',
            'handleFilterClear',
            'handleMouseEnter',
            'handleMouseLeave',
            'handlePlayingEnd',
            'handleSelect',
            'handleTagClick',
            'setFilteredDataRef'
        ]);
        this.state = {
            playingItem: null,
            filterQuery: '',
            selectedTag: ALL_TAG.tag,
            loaded: false,
            memberTags: getMemberOnlyTags(props.data)
        };
    }
    componentDidMount () {
        // Allow the spinner to display before loading the content
        setTimeout(() => {
            this.setState({loaded: true});
        });
        if (this.props.setStopHandler) this.props.setStopHandler(this.handlePlayingEnd);
    }
    componentDidUpdate (prevProps, prevState) {
        if (prevProps.data !== this.props.data) {
            this.setState({
                memberTags: getMemberOnlyTags(this.props.data)
            });
        }

        if (prevState.filterQuery !== this.state.filterQuery ||
            prevState.selectedTag !== this.state.selectedTag) {
            this.scrollToTop();
        }
    }

    static contextType = ModalFocusContext;

    handleSelect (id) {
        const selectedItem = this.getFilteredData().find(item => this.constructKey(item) === id);

        this.handleClose();
        this.props.onItemSelected(selectedItem);
    }
    handleClose () {
        this.props.onRequestClose();
        this.context.restoreFocus();
    }
    handleTagClick (tag) {
        if (this.state.playingItem === null) {
            this.setState({
                filterQuery: '',
                selectedTag: tag.toLowerCase()
            });
        } else {
            this.props.onItemMouseLeave((this.getFilteredData()
                .find(item => this.constructKey(item) === this.state.playingItem)));
            this.setState({
                filterQuery: '',
                playingItem: null,
                selectedTag: tag.toLowerCase()
            });
        }
    }
    handleMouseEnter (id) {
        // don't restart if mouse over already playing item
        if (this.props.onItemMouseEnter && this.state.playingItem !== id) {
            this.props.onItemMouseEnter(this.getFilteredData()
                .find(item => this.constructKey(item) === id));
            this.setState({
                playingItem: id
            });
        }
    }
    handleMouseLeave (id) {
        if (this.props.onItemMouseLeave) {
            this.props.onItemMouseLeave(this.getFilteredData()
                .find(item => this.constructKey(item) === id));
            this.setState({
                playingItem: null
            });
        }
    }
    handlePlayingEnd () {
        if (this.state.playingItem !== null) {
            this.setState({
                playingItem: null
            });
        }
    }
    handleFilterChange (event) {
        if (this.state.playingItem === null) {
            this.setState({
                filterQuery: event.target.value,
                selectedTag: ALL_TAG.tag
            });
        } else {
            this.props.onItemMouseLeave(this.getFilteredData()
                .find(item => this.constructKey(item) === this.state.playingItem));
            this.setState({
                filterQuery: event.target.value,
                playingItem: null,
                selectedTag: ALL_TAG.tag
            });
        }
    }
    handleFilterClear () {
        this.setState({filterQuery: ''});
    }
    getFilteredData () {
        if (this.state.selectedTag === ALL_TAG.tag) {
            if (!this.state.filterQuery) return this.props.data;
            return this.props.data.filter(dataItem => (
                (dataItem.tags || [])
                    // Second argument to map sets `this`
                    .map(String.prototype.toLowerCase.call, String.prototype.toLowerCase)
                    .concat(dataItem.name ?
                        (typeof dataItem.name === 'string' ?
                        // Use the name if it is a string, else use formatMessage to get the translated name
                            dataItem.name : this.props.intl.formatMessage(dataItem.name.props)
                        ).toLowerCase() :
                        null)
                    .join('\n') // unlikely to partially match newlines
                    .indexOf(this.state.filterQuery.toLowerCase()) !== -1
            ));
        }
        return this.props.data.filter(dataItem => (
            dataItem.tags &&
            dataItem.tags
                .map(String.prototype.toLowerCase.call, String.prototype.toLowerCase)
                .indexOf(this.state.selectedTag) !== -1
        ));
    }
    constructKey (data) {
        return typeof data.name === 'string' ? data.name : data.rawURL;
    }
    scrollToTop () {
        this.filteredDataRef.scrollTop = 0;
    }
    setFilteredDataRef (ref) {
        this.filteredDataRef = ref;
    }
    renderElement (data) {
        const key = this.constructKey(data);
        const icons = getItemIcons(data);
        return (<LibraryItem
            bluetoothRequired={data.bluetoothRequired}
            collaborator={data.collaborator}
            description={data.description}
            disabled={data.disabled}
            extensionId={data.extensionId}
            featured={data.featured}
            hidden={data.hidden}
            icons={icons}
            id={key}
            insetIconURL={data.insetIconURL}
            internetConnectionRequired={data.internetConnectionRequired}
            isPlaying={this.state.playingItem === key}
            key={key}
            name={data.name}
            showPlayButton={this.props.showPlayButton}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            onSelect={this.handleSelect}
            isMemberOnly={data.isMemberOnly}
        />);
    }
    renderData (data) {
        if (this.state.selectedTag !== ALL_TAG.tag || !this.props.withCategories) {
            return data.map(item => this.renderElement(item));
        }

        // Object.groupBy is not available on older versions of javascript
        const dataByCategory = data.reduce((acc, el) => {
            acc[el.category] = acc[el.category] || [];
            acc[el.category].push(el);
            return acc;
        }, {});
        const categoriesOrder = Object.values(CATEGORIES);

        return Object.entries(dataByCategory)
            .sort(([key1], [key2]) => categoriesOrder.indexOf(key1) - categoriesOrder.indexOf(key2))
            .map(([key, values]) =>
                (<div
                    key={key}
                    className={styles.libraryCategory}
                >
                    {key === 'undefined' ?
                        null :
                        <span className={styles.libraryCategoryTitle}>
                            {this.props.intl.formatMessage(messages[key])}
                        </span>
                    }
                    <div
                        className={styles.libraryCategoryItems}
                    >
                        {values.map(item => this.renderElement(item))}
                    </div>
                </div>));
    }
    render () {
        return (
            <Modal
                fullScreen
                contentLabel={this.props.title}
                id={this.props.id}
                onRequestClose={this.handleClose}
            >
                {(this.props.filterable || this.props.tags) && (
                    <div className={styles.filterBar}>
                        {this.props.filterable && (
                            <Filter
                                className={classNames(
                                    styles.filterBarItem,
                                    styles.filter
                                )}
                                filterQuery={this.state.filterQuery}
                                inputClassName={styles.filterInput}
                                placeholderText={this.props.intl.formatMessage(messages.filterPlaceholder)}
                                onChange={this.handleFilterChange}
                                onClear={this.handleFilterClear}
                            />
                        )}
                        {this.props.filterable && this.props.tags && (
                            <Divider className={classNames(styles.filterBarItem, styles.divider)} />
                        )}
                        {this.props.tags &&
                            <div className={styles.tagWrapper}>
                                {tagListPrefix.concat(this.props.tags, this.state.memberTags).map((tagProps, id) => (
                                    <TagButton
                                        active={this.state.selectedTag === tagProps.tag.toLowerCase()}
                                        className={classNames(
                                            styles.filterBarItem,
                                            styles.tagButton,
                                            tagProps.className,
                                            {[styles.membershipTag]: tagProps.tag.toLowerCase() === MEMBERSHIP_TAG.tag}
                                        )}
                                        key={`tag-button-${id}`}
                                        onClick={this.handleTagClick}
                                        {...tagProps}
                                    />
                                ))}
                            </div>
                        }
                    </div>
                )}
                <div
                    className={classNames(styles.libraryScrollGrid, {
                        [styles.withFilterBar]: this.props.filterable || this.props.tags
                    })}
                    ref={this.setFilteredDataRef}
                >
                    {this.state.loaded ? this.renderData(this.getFilteredData()) : (
                        <div className={styles.spinnerWrapper}>
                            <Spinner
                                large
                                level="primary"
                            />
                        </div>
                    )}
                </div>
            </Modal>
        );
    }
}

LibraryComponent.propTypes = {
    data: PropTypes.arrayOf(
         
        // An item in the library
        PropTypes.shape({
            // @todo remove md5/rawURL prop from library, refactor to use storage
            md5: PropTypes.string,
            name: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.node
            ]),
            rawURL: PropTypes.string
        })
         
    ),
    filterable: PropTypes.bool,
    withCategories: PropTypes.bool,
    id: PropTypes.string.isRequired,
    intl: intlShape.isRequired,
    onItemMouseEnter: PropTypes.func,
    onItemMouseLeave: PropTypes.func,
    onItemSelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    setStopHandler: PropTypes.func,
    showPlayButton: PropTypes.bool,
    tags: PropTypes.arrayOf(PropTypes.shape(TagButton.propTypes)),
    title: PropTypes.string.isRequired
};

LibraryComponent.defaultProps = {
    filterable: true,
    showPlayButton: false
};

export default injectIntl(LibraryComponent);
