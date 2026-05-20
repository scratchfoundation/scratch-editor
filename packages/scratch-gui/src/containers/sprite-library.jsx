import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {injectIntl, defineMessages} from 'react-intl';
import {connect} from 'react-redux';
import intlShape from '../lib/intlShape.js';
import {spriteShape} from '../lib/assets-prop-types.js';
import VM from '@scratch/scratch-vm';
import mergeDynamicAssets from '../lib/merge-dynamic-assets.js';

import spriteLibraryContent from '../lib/libraries/sprites.json';
import randomizeSpritePosition from '../lib/randomize-sprite-position';
import spriteTags from '../lib/libraries/sprite-tags';

import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Sprite',
        description: 'Heading for the sprite library',
        id: 'gui.spriteLibrary.chooseASprite'
    }
});

class SpriteLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'mergeDynamicAssets'
        ]);
        this.processedSprites = {};
    }
    handleItemSelect (item) {
        // Randomize position of library sprite
        randomizeSpritePosition(item);
        this.props.vm.addSprite(JSON.stringify(item)).then(() => {
            this.props.onActivateBlocksTab();
        });
    }
    mergeDynamicAssets () {
        if (this.processedSprites.source === this.props.dynamicSprites) {
            return this.processedSprites.data;
        }
        this.processedSprites = mergeDynamicAssets(
            spriteLibraryContent,
            this.props.dynamicSprites
        );
        return this.processedSprites.data;
    }
    render () {
        const data = this.mergeDynamicAssets();
        return (
            <LibraryComponent
                data={data}
                id="spriteLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

const mapStateToProps = state => ({
    dynamicSprites: state.scratchGui.dynamicAssets.sprites
});

SpriteLibrary.propTypes = {
    dynamicSprites: PropTypes.arrayOf(spriteShape),
    intl: intlShape.isRequired,
    onActivateBlocksTab: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(connect(mapStateToProps)(SpriteLibrary));
