import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';

export const MenuRefContext = React.createContext(null);

export class MenuRefProvider extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            openRefs: []
        };

        bindAll(this, [
            'addInner',
            'isTopMenu',
            'isOpenMenu',
            'removeAll',
            'removeByRef',
            'removeInner'
        ]);
    }

    isTopMenu (ref) {
        const {openRefs} = this.state;
        return openRefs.length > 0 && openRefs[openRefs.length - 1] === ref;
    }

    isOpenMenu (ref) {
        return this.state.openRefs.includes(ref);
    }

    addInner (ref) {
        this.setState(prev => ({
            openRefs: [...prev.openRefs, ref]
        }));
    }

    removeByRef (ref) {
        this.setState(prev => {
            const refs = prev.openRefs;
            const index = refs.indexOf(ref);

            if (index === -1) return {openRefs: refs};

            return {
                openRefs: refs.slice(0, index)
            };
        });
    }

    removeInner () {
        this.setState(prev => ({
            openRefs: prev.openRefs.slice(0, prev.openRefs.length - 1)
        }));
    }

    removeAll () {
        this.setState({openRefs: []});
    }

    // printChain () {
    //     console.log(this.state.openRefs);
    // }

    render () {
        const value = {
            openRefs: this.state.openRefs,
            isTopMenu: this.isTopMenu,
            isOpenMenu: this.isOpenMenu,
            addInner: this.addInner,
            removeInner: this.removeInner,
            removeAll: this.removeAll,
            removeByRef: this.removeByRef
            // printChain: this.printChain
        };

        return (
            <MenuRefContext.Provider value={value}>
                {this.props.children}
            </MenuRefContext.Provider>
        );
    }
}

MenuRefProvider.propTypes = {
    children: PropTypes.node
};
