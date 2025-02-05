import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import BackpackComponent from '../components/backpack/backpack.jsx';
import {
    getBackpackContents,
    saveBackpackObject,
    deleteBackpackObject,
    soundPayload,
    costumePayload,
    spritePayload,
    codePayload
} from '../lib/backpack-api';
import DragConstants from '../lib/drag-constants';
import DropAreaHOC from '../lib/drop-area-hoc.jsx';
import {GUIStoragePropType} from '../gui-config';

import {connect} from 'react-redux';
import VM from '@scratch/scratch-vm';

const dragTypes = [DragConstants.COSTUME, DragConstants.SOUND, DragConstants.SPRITE];
const DroppableBackpack = DropAreaHOC(dragTypes)(BackpackComponent);

class Backpack extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleDrop',
            'handleToggle',
            'handleDelete',
            'getContents',
            'handleMouseEnter',
            'handleMouseLeave',
            'handleBlockDragEnd',
            'handleBlockDragUpdate',
            'handleMore'
        ]);
        this.state = {
            // While the DroppableHOC manages drop interactions for asset tiles,
            // we still need to micromanage drops coming from the block workspace.
            // TODO this may be refactorable with the share-the-love logic in SpriteSelectorItem
            blockDragOutsideWorkspace: false,
            blockDragOverBackpack: false,
            error: false,
            itemsPerPage: 20,
            moreToLoad: false,
            loading: false,
            expanded: false,
            contents: []
        };

        if (props.host) {
            props.storage.setBackpackHost?.(props.host);
        }
    }
    componentDidMount () {
        this.props.vm.addListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.addListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('BLOCK_DRAG_END', this.handleBlockDragEnd);
        this.props.vm.removeListener('BLOCK_DRAG_UPDATE', this.handleBlockDragUpdate);
    }
    handleToggle () {
        const newState = !this.state.expanded;
        this.setState({expanded: newState, contents: []}, () => {
            // Emit resize on window to get blocks to resize
            window.dispatchEvent(new Event('resize'));
        });
        if (newState) {
            this.getContents();
        }
    }
    handleDrop (dragInfo) {
        const scratchStorage = this.props.storage.scratchStorage;

        let payloader = null;
        let presaveAsset = null;
        switch (dragInfo.dragType) {
        case DragConstants.COSTUME:
            payloader = costume => costumePayload(scratchStorage, costume);
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SOUND:
            payloader = soundPayload;
            presaveAsset = dragInfo.payload.asset;
            break;
        case DragConstants.SPRITE:
            payloader = spritePayload;
            break;
        case DragConstants.CODE:
            payloader = codePayload;
            break;
        }
        if (!payloader) return;

        // Creating the payload is async, so set loading before starting
        this.setState({loading: true}, () => {
            payloader(dragInfo.payload, this.props.vm)
                .then(payload => {
                    // Force the asset to save to the asset server before storing in backpack
                    // Ensures any asset present in the backpack is also on the asset server
                    if (presaveAsset && !presaveAsset.clean) {
                        return scratchStorage.store(
                            presaveAsset.assetType,
                            presaveAsset.dataFormat,
                            presaveAsset.data,
                            presaveAsset.assetId
                        ).then(() => payload);
                    }
                    return payload;
                })
                .then(payload => saveBackpackObject({
                    host: this.props.host,
                    token: this.props.token,
                    username: this.props.username,
                    ...payload
                }))
                .then(item => {
                    this.setState({
                        loading: false,
                        contents: [item].concat(this.state.contents)
                    });
                })
                .catch(error => {
                    this.setState({error: true, loading: false});
                    throw error;
                });
        });
    }
    handleDelete (id) {
        this.setState({loading: true}, () => {
            deleteBackpackObject({
                host: this.props.host,
                token: this.props.token,
                username: this.props.username,
                id: id
            })
                .then(() => {
                    this.setState({
                        loading: false,
                        contents: this.state.contents.filter(o => o.id !== id)
                    });
                })
                .catch(error => {
                    this.setState({error: true, loading: false});
                    throw error;
                });
        });
    }
    getContents () {
        if (this.props.token && this.props.username) {
            this.setState({loading: true, error: false}, () => {
                getBackpackContents({
                    host: this.props.host,
                    token: this.props.token,
                    username: this.props.username,
                    offset: this.state.contents.length,
                    limit: this.state.itemsPerPage
                })
                    .then(contents => {
                        this.setState({
                            contents: this.state.contents.concat(contents),
                            moreToLoad: contents.length === this.state.itemsPerPage,
                            loading: false
                        });
                    })
                    .catch(error => {
                        this.setState({error: true, loading: false});
                        throw error;
                    });
            });
        }
    }
    handleBlockDragUpdate (isOutsideWorkspace) {
        this.setState({
            blockDragOutsideWorkspace: isOutsideWorkspace
        });
    }
    handleMouseEnter () {
        if (this.state.blockDragOutsideWorkspace) {
            this.setState({
                blockDragOverBackpack: true
            });
        }
    }
    handleMouseLeave () {
        this.setState({
            blockDragOverBackpack: false
        });
    }
    handleBlockDragEnd (blocks, topBlockId) {
        if (this.state.blockDragOverBackpack) {
            this.handleDrop({
                dragType: DragConstants.CODE,
                payload: {
                    blockObjects: blocks,
                    topBlockId: topBlockId
                }
            });
        }
        this.setState({
            blockDragOverBackpack: false,
            blockDragOutsideWorkspace: false
        });
    }
    handleMore () {
        this.getContents();
    }
    render () {
        return (
            <DroppableBackpack
                blockDragOver={this.state.blockDragOverBackpack}
                contents={this.state.contents}
                error={this.state.error}
                expanded={this.state.expanded}
                loading={this.state.loading}
                showMore={this.state.moreToLoad}
                onDelete={this.handleDelete}
                onDrop={this.handleDrop}
                onMore={this.handleMore}
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
                onToggle={this.props.host ? this.handleToggle : null}
            />
        );
    }
}

Backpack.propTypes = {
    storage: GUIStoragePropType,
    host: PropTypes.string,
    token: PropTypes.string,
    username: PropTypes.string,
    vm: PropTypes.instanceOf(VM)
};

const getTokenAndUsername = state => {
    // Look for the session state provided by scratch-www
    if (state.session && state.session.session && state.session.session.user) {
        return {
            token: state.session.session.user.token,
            username: state.session.session.user.username
        };
    }
    // Otherwise try to pull testing params out of the URL, or return nulls
    // TODO a hack for testing the backpack
    const tokenMatches = window.location.href.match(/[?&]token=([^&]*)&?/);
    const usernameMatches = window.location.href.match(/[?&]username=([^&]*)&?/);
    return {
        token: tokenMatches ? tokenMatches[1] : null,
        username: usernameMatches ? usernameMatches[1] : null
    };
};

const mapStateToProps = state => Object.assign(
    {
        storage: state.scratchGui.config.storage,
        dragInfo: state.scratchGui.assetDrag,
        vm: state.scratchGui.vm,
        blockDrag: state.scratchGui.blockDrag
    },
    getTokenAndUsername(state)
);

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Backpack);
