import React from 'react';
import {render} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

const renderWithIntl = (ui, {locale = 'en', messages = {}} = {}) => ({
    ...render(
        <IntlProvider
            locale={locale}
            messages={messages}
        >
            {ui}
        </IntlProvider>
    )
});

export {renderWithIntl};
