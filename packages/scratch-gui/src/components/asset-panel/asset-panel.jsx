import React from 'react';

import Box from '../box/box.jsx';
import Selector from './selector.jsx';
import styles from './asset-panel.css';
import PropTypes from 'prop-types';

const AssetPanel = props => {
    const {ariaLabel, ariaRole, ...restProps} = props;

    return (<Box
        aria-label={ariaLabel}
        role={ariaRole}
        className={styles.wrapper}
    >
        <Selector
            className={styles.selector}
            {...restProps}
        />
        <Box className={styles.detailArea}>
            {props.children}
        </Box>
    </Box>);
};

AssetPanel.propTypes = {
    ariaLabel: PropTypes.string,
    ariaRole: PropTypes.string,
    ...Selector.propTypes
};

export default AssetPanel;
