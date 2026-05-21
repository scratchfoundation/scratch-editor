import PropTypes from 'prop-types';
import React from 'react';
import VisibilitySensor from 'react-visibility-sensor';

import {legacyConfig} from '../../legacy-config';
import {PLATFORM} from '../../lib/platform.js';
import bindAll from 'lodash.bindall';

class ScratchImage extends React.PureComponent {
    static init () {
        this._maxParallelism = 6;
        this._currentJobs = 0;
        this._pendingImages = new Set();
        this._assetCache = new Map();
    }

    static loadPendingImages () {
        if (this._currentJobs >= this._maxParallelism) {
            // already busy
            return;
        }

        // Find the first visible image. Fall back to the first non-visible image only
        // when parallelism is capped (desktop/Android), so that off-screen assets are
        // eventually pre-loaded as slots free up.
        let nextImage;
        for (const image of this._pendingImages) {
            if (image.isVisible) {
                nextImage = image;
                break;
            } else if (this._maxParallelism !== Infinity) {
                // TODO: Why was this commented out on native branch?
                nextImage = nextImage || image;
            }
        }

        // If we found an image to load:
        // 1) Remove it from the queue
        // 2) Load the image
        // 3) Pump the queue again
        if (nextImage) {
            this._pendingImages.delete(nextImage);
            const assetId = nextImage._pendingAssetId;
            const assetType = nextImage._pendingAssetType;
            ++this._currentJobs;
            legacyConfig.storage.scratchStorage
                .load(assetType, assetId)
                .then(asset => {
                    const dataURI = asset.encodeDataURI();
                    ScratchImage._assetCache.set(assetId, dataURI);
                    if (!nextImage.wasUnmounted) {
                        nextImage.setState({
                            imageURI: dataURI
                        });
                    }
                    --this._currentJobs;
                    this.loadPendingImages();
                });
        }
    }

    constructor (props) {
        super(props);
        bindAll(this, [
            'handleVisibilityChange'
        ]);
        this.state = {};
        if (props.platform === PLATFORM.WEB) {
            ScratchImage._maxParallelism = Infinity;
        }
        Object.assign(this.state, this._loadImageSource(props.imageSource));
    }
    componentWillReceiveProps (nextProps) {
        if (this.props.platform !== nextProps.platform) {
            ScratchImage._maxParallelism = nextProps.platform === PLATFORM.WEB ? Infinity : 6;
        }
        const newState = this._loadImageSource(nextProps.imageSource);
        this.setState(newState);
        // If a new asset was queued and this component is already visible, pump the
        // queue immediately so the new frame loads without waiting for a scroll event
        // (e.g. icon rotation on hover).
        if (newState.lastRequestedAsset && this.isVisible) {
            ScratchImage.loadPendingImages();
        }
    }
    componentWillUnmount () {
        this.wasUnmounted = true;
        ScratchImage._pendingImages.delete(this);
    }
    /**
     * Calculate the state changes necessary to load the image specified in the provided source info. If the component
     * is mounted, call setState() with the return value of this function. If the component has not yet mounted, use
     * the return value of this function as initial state for the component.
     * @param {object} imageSource - the new source for the image, including either assetId or URI
     * @returns {object} - the new state values, if any.
     */
    _loadImageSource (imageSource) {
        if (imageSource) {
            if (imageSource.uri) {
                ScratchImage._pendingImages.delete(this);
                return {
                    imageURI: imageSource.uri,
                    lastRequestedAsset: null
                };
            }
            const cached = ScratchImage._assetCache.get(imageSource.assetId);
            if (cached) {
                ScratchImage._pendingImages.delete(this);
                return {
                    imageURI: cached,
                    lastRequestedAsset: null
                };
            }
            if (this.state.lastRequestedAsset !== imageSource.assetId) {
                // Capture assetId/assetType now so loadPendingImages uses the
                // correct values. Reading props.imageSource at pop time would
                // give the previous frame because componentWillReceiveProps
                // fires before React updates this.props.
                this._pendingAssetId = imageSource.assetId;
                this._pendingAssetType = imageSource.assetType;
                ScratchImage._pendingImages.add(this);
                return {
                    lastRequestedAsset: imageSource.assetId
                };
            }
        }
        // Nothing to do - don't change any state.
        return {};
    }
    handleVisibilityChange (isVisible) {
        this.isVisible = isVisible;
        if (isVisible) {
            ScratchImage.loadPendingImages();
        }
    }
    render () {
        const {
            // TODO: Does this cause issues for desktop?
            src: _src, // eslint-disable-line react/prop-types
            imageSource: _imageSource,
            platform: _platform,

            ...imgProps
        } = this.props;
        return (
            <VisibilitySensor
                intervalCheck
                scrollCheck
                onChange={this.handleVisibilityChange}
            >
                <img
                    src={this.state.imageURI}
                    style={{
                        minWidth: '1px',
                        minHeight: '1px'
                    }}
                    {...imgProps}
                />
            </VisibilitySensor>
        );
    }
}

ScratchImage.ImageSourcePropType = PropTypes.oneOfType([
    PropTypes.shape({
        assetId: PropTypes.string.isRequired,
        assetType: PropTypes.oneOf(
            Object.values(
                legacyConfig.storage.scratchStorage.AssetType
            )
        ).isRequired
    }),
    PropTypes.shape({
        uri: PropTypes.string.isRequired
    })
]);

ScratchImage.propTypes = {
    imageSource: ScratchImage.ImageSourcePropType.isRequired,
    platform: PropTypes.oneOf(Object.values(PLATFORM))
};

ScratchImage.init();

export default ScratchImage;
