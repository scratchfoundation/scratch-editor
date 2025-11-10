import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import {FormattedMessage} from 'react-intl';
import UserAvatar from './user-avatar.jsx';

import styles from './author-info.css';

const AuthorInfo = ({
    className,
    imageUrl,
    projectTitle,
    // TODO: use userId to link to user's profile
    userId,
    username
}) => (
    <div
        className={classNames(
            className,
            styles.authorInfo
        )}
    >
        <UserAvatar
            className={styles.avatar}
            imageUrl={imageUrl}
        />
        <div className={styles.titleAuthor}>
            <span className={styles.projectTitle}>
                {projectTitle}
            </span>
            <div>
                <span className={styles.usernameLine}>
                    <FormattedMessage
                        defaultMessage="by <span>{name}</span>"
                        description="Shows that a project was created by this user"
                        id="gui.authorInfo.byUser"
                        values={{
                            name: username,
                            span: name => (
                                <span className={styles.username}>
                                    {name}
                                </span>
                            )
                        }}
                    />
                </span>
            </div>
        </div>
    </div>
);

AuthorInfo.propTypes = {
    className: PropTypes.string,
    imageUrl: PropTypes.string,
    projectTitle: PropTypes.string,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    username: PropTypes.oneOfType([PropTypes.string, PropTypes.bool])
};

export default AuthorInfo;
