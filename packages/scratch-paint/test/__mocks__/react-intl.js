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
    formatHTMLMessage: ({defaultMessage}) => defaultMessage,
    now: () => 0
};

Intl.injectIntl = Node => {
    const renderWrapped = props => <Node {...props} intl={intl} />;
    renderWrapped.displayName = Node.displayName ||
        Node.name ||
        'Component';
    return renderWrapped;
};

module.exports = Intl;
