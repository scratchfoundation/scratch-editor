import bindAll from 'lodash.bindall';
import omit from 'lodash.omit';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import ThrottledPropertyHOC from '../lib/throttled-property-hoc.jsx';

import VM from '@scratch/scratch-vm';
import getCostumeUrl from '../lib/get-costume-url';
import {GUIStoragePropType} from '../gui-config';

import WatermarkComponent from '../components/watermark/watermark.jsx';

class Watermark extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'getCostumeData'
        ]);
    }

    getCostumeData () {
        if (!this.props.asset) return null;

        return getCostumeUrl(this.props.storage.scratchStorage, this.props.asset);
    }

    render () {
        const componentProps = omit(this.props, ['asset', 'vm']);
        return (
            <WatermarkComponent
                costumeURL={this.getCostumeData()}
                {...componentProps}
            />
        );
    }
}

Watermark.propTypes = {
    storage: GUIStoragePropType,
    asset: PropTypes.object,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => {
    const targets = state.scratchGui.targets;
    const currentTargetId = targets.editingTarget;

    let asset;
    if (currentTargetId) {
        if (targets.stage.id === currentTargetId) {
            asset = targets.stage.costume.asset;
        } else if (Object.prototype.hasOwnProperty.call(targets.sprites, currentTargetId)) {
            const currentSprite = targets.sprites[currentTargetId];
            asset = currentSprite.costume.asset;
        }
    }

    return {
        storage: state.scratchGui.config.storage,
        vm: state.scratchGui.vm,
        asset: asset
    };
};

const ConnectedComponent = connect(
    mapStateToProps
)(
    ThrottledPropertyHOC('asset', 500)(Watermark)
);

export default ConnectedComponent;
