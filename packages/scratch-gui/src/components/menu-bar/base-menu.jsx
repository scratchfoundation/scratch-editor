import {MenuRefContext} from '../context-menu/menu-ref-context';
import React from 'react';
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';

/* Subclasses must implement (some optionally):
_______________________________________________
render
define this.itemRefs
add onKeyDown={this.handleKeyPress}
and onParentKeyPress={this.handleKeyPressSubmenu} for MenuItem elements

and replace isOpenMenu-like props with this.isExpanded() checks

They should also receive:
______________________
onOpen,
onClose,
menuRef,
depth
*/
export class BaseMenu extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleKeyPress',
            'handleKeyPressOpenMenu',
            'handleMove',
            'handleOnOpen',
            'handleOnClose',
            'refocusRef',
            'refocusItemByIndex',
            'isExpanded'
        ]);
        
        this.state = {focusedIndex: -1};
        this.menuRef = props.menuRef;
    }

    static contextType = MenuRefContext;

    refocusRef (ref) {
        if (ref && ref.current) {
            ref.current.focus();
        }
    }

    refocusItemByIndex (index) {
        this.setState({focusedIndex: index}, () => {
            this.refocusRef(this.itemRefs[index]);
        });
    }

    handleKeyPress (e) {
        if (this.props.depth === 1) {
            if (e.key === 'Tab') {
                this.handleOnClose();
                this.context.clear();
            }
        }

        if (this.context.isTopMenu(this.menuRef)) {
            this.handleKeyPressOpenMenu(e);
        } else if (!this.isExpanded() && (e.key === ' ' || (e.key === 'ArrowRight' && this.props.depth !== 1))) {
            e.preventDefault();
            this.handleOnOpen();
        }
    }

    handleKeyPressOpenMenu (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.handleMove(1);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.handleMove(-1);
        }
        if (e.key === 'Enter' && this.props.clearOnItemSelect) {
            this.context.clear();
        }
        if (e.key === 'ArrowLeft' || e.key === 'Escape') {
            e.preventDefault();
            this.handleOnClose();
        }
    }

    handleOnOpen () {
        if (this.context.isOpenMenu(this.menuRef)) return;

        this.props.onOpen();
        this.refocusItemByIndex(0);

        this.context.push(this.menuRef, this.props.depth);
    }

    handleMove (direction) {
        const newIndex = (this.state.focusedIndex + direction + this.itemRefs.length) % this.itemRefs.length;
        this.setState({focusedIndex: newIndex}, () => {
            this.refocusRef(this.itemRefs[newIndex]);
        });
    }

    handleOnClose () {
        this.context.cut(this.menuRef);
        this.setState({focusedIndex: -1}, () => {
            this.refocusRef(this.menuRef);
        });

        this.props.onClose();
    }

    isExpanded () {
        return this.context.isOpenMenu(this.menuRef);
    }
}

BaseMenu.propTypes = {
    menuRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}),
    depth: PropTypes.number,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    clearOnItemSelect: PropTypes.bool
};

BaseMenu.defaultProps = {
    onClose: () => {},
    clearOnItemSelect: false
};
