import {renderHook} from '@testing-library/react';
import useMenuNavigation from '../../../src/hooks/use-menu-navigation';
import {MenuRefContext} from '../../../src/contexts/menu-ref-context';
import {KEY} from '../../../src/lib/navigation-keys';
import React from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';

describe('useMenuNavigation', () => {
    let menuContextMock;
    let menuRef;
    let store;
    let item1;
    let item2;

    beforeEach(() => {
        jest.useFakeTimers();

        store = configureStore({
            reducer: {
                locales: (state = {isRtl: false}) => state
            }
        });

        menuContextMock = {
            isOpenMenu: jest.fn(() => false),
            openInnerMenu: jest.fn(),
            closeMenuByRef: jest.fn(),
            closeAllMenus: jest.fn(),
            outermostMenu: {current: document.body},
            isInnermostMenu: jest.fn(() => false),
            isOutermostMenu: jest.fn(() => false)
        };
        menuRef = {current: document.createElement('div')};
        document.body.appendChild(menuRef.current);

        item1 = document.createElement('button');
        item1.setAttribute('data-menu-item', 'true');
        item2 = document.createElement('button');
        item2.setAttribute('data-menu-item', 'true');
        
        menuRef.current.appendChild(item1);
        menuRef.current.appendChild(item2);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
    });

    const createWrapper = ({children}) => (
        <Provider store={store}>
            <MenuRefContext.Provider value={menuContextMock}>
                {children}
            </MenuRefContext.Provider>
        </Provider>
    );

    test('should start with menu closed', () => {
        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        expect(result.current.isExpanded()).toBe(false);
    });

    test('skips over elements without data-menu-item or with data-menu-item="false"', () => {
        const wrapperDiv = document.createElement('div');

        const itemWithFalseAttribute = document.createElement('button');
        itemWithFalseAttribute.setAttribute('data-menu-item', 'false');
        wrapperDiv.appendChild(itemWithFalseAttribute);

        const validItem = document.createElement('button');
        validItem.setAttribute('data-menu-item', 'true');
        wrapperDiv.appendChild(validItem);

        document.body.appendChild(wrapperDiv);

        const {result} = renderHook(() => useMenuNavigation({depth: 2, defaultIndexOnOpen: 0}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = wrapperDiv;

        const validFocusSpy = jest.spyOn(validItem, 'focus');
        const invalidFocusSpy = jest.spyOn(itemWithFalseAttribute, 'focus');

        result.current.handleOnOpen();
        jest.runAllTimers();

        expect(validFocusSpy).toHaveBeenCalled();
        expect(invalidFocusSpy).not.toHaveBeenCalled();
    });

    test('handleOnOpen should open menu and focus first item', () => {
        const focusSpy = jest.spyOn(item1, 'focus');

        const {result} = renderHook(() => useMenuNavigation({depth: 1, defaultIndexOnOpen: 0}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = menuRef.current;
        result.current.handleOnOpen();

        expect(menuContextMock.openInnerMenu).toHaveBeenCalled();
        
        jest.runAllTimers();

        expect(focusSpy).toHaveBeenCalled();
    });

    test('handleOnClose should close menu and restore focus', () => {
        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });
        
        const focusSpy = jest.spyOn(menuRef.current, 'focus');
        result.current.menuRef.current = menuRef.current;
        
        result.current.handleOnClose();

        expect(menuContextMock.closeMenuByRef).toHaveBeenCalledWith(result.current.menuRef);
        expect(focusSpy).toHaveBeenCalled();
    });

    test('handleKeyDownOpenMenu ArrowDown moves focus to next item', () => {
        item1.focus();

        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = menuRef.current;

        result.current.handleKeyDownOpenMenu({
            key: KEY.ARROW_DOWN,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(document.activeElement).toBe(item2);
    });

    test('handleKeyDownOpenMenu ArrowUp moves focus to previous item', () => {
        item2.focus();

        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = menuRef.current;

        result.current.handleKeyDownOpenMenu({
            key: KEY.ARROW_UP,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(document.activeElement).toBe(item1);
    });

    test('handleKeyDownOpenMenu Enter triggers click on focused item', () => {
        item1.focus();
        const clickSpy = jest.spyOn(item1, 'click');

        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = menuRef.current;

        result.current.handleKeyDownOpenMenu({
            key: KEY.ENTER,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(clickSpy).toHaveBeenCalled();
    });

    test('handleKeyDownOpenMenu Escape closes menu', () => {
        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = menuRef.current;

        result.current.handleKeyDownOpenMenu({
            key: KEY.ESCAPE,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(menuContextMock.closeMenuByRef).toHaveBeenCalledWith(result.current.menuRef);
    });

    test('handleKeyDownOpenMenu Tab closes all menus', () => {
        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.handleKeyDownOpenMenu({
            key: KEY.TAB,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(menuContextMock.closeAllMenus).toHaveBeenCalled();
    });

    test('should handle RTL arrow key reversal', () => {
        const rtlStore = configureStore({
            reducer: {
                locales: (state = {isRtl: true}) => state
            }
        });
        
        const rtlWrapper = ({children}) => (
            <Provider store={rtlStore}>
                <MenuRefContext.Provider value={menuContextMock}>
                    {children}
                </MenuRefContext.Provider>
            </Provider>
        );

        const {result} = renderHook(() => useMenuNavigation({depth: 2}), {
            wrapper: rtlWrapper
        });
        
        result.current.menuRef.current = menuRef.current;


        result.current.handleKeyDown({
            key: KEY.ARROW_LEFT,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });
        
        expect(menuContextMock.openInnerMenu).toHaveBeenCalled();

        result.current.handleKeyDownOpenMenu({
            key: KEY.ARROW_RIGHT,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });
        
        expect(menuContextMock.closeMenuByRef).toHaveBeenCalled();
    });

    test('handleKeyDown opens menu on Enter, Space, or ARROW_RIGHT when collapsed', () => {
        const {result} = renderHook(() => useMenuNavigation({depth: 2}), {
            wrapper: createWrapper
        });
        
        result.current.menuRef.current = menuRef.current;

        const keysToTest = [KEY.ENTER, KEY.SPACE, KEY.ARROW_RIGHT];

        keysToTest.forEach(key => {
            menuContextMock.openInnerMenu.mockClear();
            result.current.handleKeyDown({
                key,
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
            expect(menuContextMock.openInnerMenu).toHaveBeenCalled();
        });
    });

    test('handleKeyDown closes menu on Tab', () => {
        menuContextMock.isOpenMenu.mockReturnValue(true);

        const {result} = renderHook(() => useMenuNavigation({depth: 1}), {
            wrapper: createWrapper
        });

        result.current.handleKeyDown({
            key: KEY.TAB,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        });

        expect(menuContextMock.closeAllMenus).toHaveBeenCalled();
    });

    // Testing the following structure of the menu, where the button should not be misread as an item:
    // <div data-menu-item-wrapper>
    //  <button data-menu-item>Menu Button</button>
    //  <div> - submenu
    //   <li data-menu-item>Item 1</li>
    //   <li data-menu-item>Item 2</li>
    //  </div>
    // <div>
    test('focuses first item inside submenu wrapper with handleOnOpen, skipping parent menu button', () => {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.setAttribute('tabIndex', '-1');
        wrapperDiv.setAttribute('data-menu-item-wrapper', 'true');
        const wrapperFocusSpy = jest.spyOn(wrapperDiv, 'focus');

        // Should not be focused
        const menuButton = document.createElement('button');
        menuButton.setAttribute('data-menu-item', 'true');
        wrapperDiv.appendChild(menuButton);
        const buttonFocusSpy = jest.spyOn(menuButton, 'focus');

        const submenu = document.createElement('div');

        submenu.appendChild(item1);
        submenu.appendChild(item2);

        wrapperDiv.appendChild(submenu);

        const itemFocusSpy = jest.spyOn(item1, 'focus');

        const {result} = renderHook(() => useMenuNavigation({depth: 2, defaultIndexOnOpen: 0}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = wrapperDiv;
        result.current.handleOnOpen();

        jest.runAllTimers();

        expect(menuContextMock.openInnerMenu).toHaveBeenCalled();
        expect(buttonFocusSpy).not.toHaveBeenCalled();
        expect(itemFocusSpy).toHaveBeenCalled();

        result.current.handleOnClose();
        expect(menuContextMock.closeMenuByRef).toHaveBeenCalledWith(result.current.menuRef);
        expect(wrapperFocusSpy).toHaveBeenCalled();
    });

    test("ENTER, SPACE and ARROW_RIGHT don't interact with the button", () => {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.setAttribute('tabIndex', '-1');
        wrapperDiv.setAttribute('data-menu-item-wrapper', 'true');

        const menuButton = document.createElement('button');
        menuButton.setAttribute('data-menu-item', 'true');
        wrapperDiv.appendChild(menuButton);
        const buttonFocusSpy = jest.spyOn(menuButton, 'focus');

        const submenu = document.createElement('div');

        submenu.appendChild(item1);
        submenu.appendChild(item2);

        wrapperDiv.appendChild(submenu);

        const {result} = renderHook(() => useMenuNavigation({depth: 2, defaultIndexOnOpen: 0}), {
            wrapper: createWrapper
        });

        result.current.menuRef.current = wrapperDiv;
        const keysToTest = [KEY.ENTER, KEY.SPACE, KEY.ARROW_RIGHT];

        keysToTest.forEach(key => {
            menuContextMock.openInnerMenu.mockClear();
            result.current.handleKeyDown({
                key,
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            });
            expect(buttonFocusSpy).not.toHaveBeenCalled();
        });
    });
});
