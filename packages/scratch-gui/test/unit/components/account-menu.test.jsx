import React from 'react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import AccountMenu from '../../../src/components/menu-bar/account-menu';
import {fireEvent} from '@testing-library/react';

import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import {MenuRefProvider} from '../../../src/contexts/menu-ref-context.jsx';

describe('AccountMenu Component', () => {
    const store = configureStore()({
        locales: {
            isRtl: false,
            locale: 'en-US'
        }
    });

    const builtInMenuOpts = {
        canHaveSession: true,
        canLogout: true,
        profileUrl: '/users/someone',
        myStuffUrl: '/mystuff',
        myClassesUrl: '/classes',
        myClassUrl: '/class',
        accountSettingsUrl: '/settings'
    };

    const renderOpenMenu = function (props = {}) {
        const result = renderWithIntl(
            <Provider store={store}>
                <MenuRefProvider>
                    <AccountMenu
                        username="someone"
                        depth={1}
                        onLogOut={jest.fn()}
                        {...props}
                    />
                </MenuRefProvider>
            </Provider>
        );
        fireEvent.click(result.container.querySelector('button[aria-label="Account menu"]'));
        return result;
    };

    const getItemLabels = container =>
        Array.from(container.querySelectorAll('li[data-menu-item]'))
            .map(item => item.textContent);

    test('renders the built-in items when no custom items are provided', () => {
        const {container} = renderOpenMenu({menuOpts: builtInMenuOpts});
        expect(getItemLabels(container)).toEqual([
            'Profile',
            'My Stuff',
            'My Classes',
            'My Class',
            'Account settings',
            'Sign out'
        ]);
    });

    test('custom items replace the built-in ones, keeping sign out', () => {
        const {container} = renderOpenMenu({
            menuOpts: {
                ...builtInMenuOpts,
                menuItems: [
                    {id: 'dashboard', label: 'My Dashboard', href: '/dashboard'},
                    {id: 'settings', label: 'Settings', href: '/settings'}
                ]
            }
        });
        expect(getItemLabels(container)).toEqual([
            'My Dashboard',
            'Settings',
            'Sign out'
        ]);
    });

    test('sign out is still controlled by canLogout with custom items', () => {
        const {container} = renderOpenMenu({
            menuOpts: {
                canHaveSession: true,
                canLogout: false,
                menuItems: [{id: 'settings', label: 'Settings', href: '/settings'}]
            }
        });
        expect(getItemLabels(container)).toEqual(['Settings']);
    });

    test('clicking a custom item with onClick calls the handler', () => {
        const onClick = jest.fn();
        const {container} = renderOpenMenu({
            menuOpts: {
                canHaveSession: true,
                menuItems: [{id: 'custom', label: 'Custom', onClick}]
            }
        });
        const item = Array.from(container.querySelectorAll('li[data-menu-item]'))
            .find(li => li.textContent === 'Custom');

        fireEvent.click(item);
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
