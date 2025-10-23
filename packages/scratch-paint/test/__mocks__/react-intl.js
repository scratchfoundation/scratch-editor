// __mocks__/react-intl.js

import React from 'react';
const Intl = require.requireActual('react-intl');

// Here goes intl context injected into component, feel free to extend
const intl = {
    formatMessage: ({defaultMessage}) => defaultMessage,
    formatDate: ({defaultMessage}) => defaultMessage,
    formatTime: ({defaultMessage}) => defaultMessage,
    formatRelative: ({defaultMessage}) => defaultMessage,
    formatNumber: ({defaultMessage}) => defaultMessage,
    formatPlural: ({defaultMessage}) => defaultMessage,
    now: () => 0
};

Intl.injectIntl = Node => {
    // eslint-disable-next-line react/jsx-filename-extension
    const renderWrapped = props => (<Node
        {...props}
        intl={intl}
    />);
    renderWrapped.displayName = Node.displayName ||
        Node.name ||
        'Component';
    return renderWrapped;
};

module.exports = Intl;
