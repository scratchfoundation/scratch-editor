import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import intlShape from '../lib/intlShape.js';
import {costumeShape} from '../lib/assets-prop-types.js';
import VM from '@scratch/scratch-vm';
import mergeDynamicAssets from '../lib/merge-dynamic-assets.js';

import costumeLibraryContent from '../lib/libraries/costumes.json';
import spriteTags from '../lib/libraries/sprite-tags';
import LibraryComponent from '../components/library/library.jsx';

const messages = defineMessages({
    libraryTitle: {
        defaultMessage: 'Choose a Costume',
        description: 'Heading for the costume library',
        id: 'gui.costumeLibrary.chooseACostume'
    }
});


class CostumeLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelected',
            'mergeDynamicAssets'
        ]);
        this.processedCostumes = {};
    }
    handleItemSelected (item) {
        const vmCostume = {
            name: item.name,
            rotationCenterX: item.rotationCenterX,
            rotationCenterY: item.rotationCenterY,
            bitmapResolution: item.bitmapResolution,
            skinId: null
        };
        this.props.vm.addCostumeFromLibrary(item.md5ext, vmCostume);
    }
    mergeDynamicAssets () {
        if (this.processedCostumes.source === this.props.dynamicCostumes) {
            return this.processedCostumes.data;
        }
        this.processedCostumes = mergeDynamicAssets(
            costumeLibraryContent,
            this.props.dynamicCostumes
        );
        return this.processedCostumes.data;
    }
    render () {
        const data = this.mergeDynamicAssets();
        return (
            <LibraryComponent
                data={data}
                id="costumeLibrary"
                tags={spriteTags}
                title={this.props.intl.formatMessage(messages.libraryTitle)}
                onItemSelected={this.handleItemSelected}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
};

const mapStateToProps = state => ({
    dynamicCostumes: state.scratchGui.dynamicAssets.costumes
});

CostumeLibrary.propTypes = {
    dynamicCostumes: PropTypes.arrayOf(costumeShape),
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default injectIntl(connect(mapStateToProps)(CostumeLibrary));
