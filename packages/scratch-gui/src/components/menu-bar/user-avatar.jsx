import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './user-avatar.css';

const UserAvatar = ({
    className,
    imageUrl
}) => (
    <img
        className={classNames(
            className,
            styles.userThumbnail
        )}
        src={imageUrl}
        referrerPolicy="no-referrer"
    />
);

UserAvatar.propTypes = {
    className: PropTypes.string,
    imageUrl: PropTypes.string
};

export default UserAvatar;
