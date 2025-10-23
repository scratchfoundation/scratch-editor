import {updateIntl as superUpdateIntl, IntlProvider, intlReducer} from 'react-intl-redux';

import paintMessages from 'scratch-l10n/locales/paint-editor-msgs';

const intlInitialState = {
    intl: {
        defaultLocale: 'en',
        locale: 'en',
        messages: paintMessages.en.messages
    }
};

const updateIntl = locale => superUpdateIntl({
    locale: locale,
    messages: paintMessages[locale].messages || paintMessages.en.messages
});

export {
    intlReducer as default,
    IntlProvider,
    intlInitialState,
    updateIntl
};
