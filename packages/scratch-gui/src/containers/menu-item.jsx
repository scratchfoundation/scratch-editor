import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {MenuItem as MenuItemComponent} from '../components/menu/menu.jsx';

class MenuItem extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'navigateToHref'
        ]);
    }
    navigateToHref () {
        if (this.props.href) window.location.href = this.props.href;
    }
    render () {
        const {
            children,
            className,
            onClick,
            onParentKeyDown,
            isDataMenuItem,
            isDataMenuItemWrapper
        } = this.props;
        const clickAction = onClick ? onClick : this.navigateToHref;
        return (
            <MenuItemComponent
                className={className}
                onClick={clickAction}
                onParentKeyDown={onParentKeyDown}
                isDataMenuItem={isDataMenuItem}
                isDataMenuItemWrapper={isDataMenuItemWrapper}
            >
                {children}
            </MenuItemComponent>
        );
    }
}

MenuItem.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    // can take an onClick prop, or take an href and build an onClick handler
    href: PropTypes.string,
    onClick: PropTypes.func,
    onParentKeyDown: PropTypes.func,
    isDataMenuItem: PropTypes.bool,
    isDataMenuItemWrapper: PropTypes.bool
};

export default MenuItem;
