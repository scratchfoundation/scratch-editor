import React from 'react';
import configureStore from 'redux-mock-store';
import MenuBarHOC from '../../../src/containers/menu-bar-hoc.jsx';
import {render} from '@testing-library/react';
import '@testing-library/jest-dom';

// TODO rewrite this test to use react-testing-library

describe('Menu Bar HOC', () => {
    const mockStore = configureStore();
    let store;
    let Component;

    beforeEach(() => {
        store = mockStore({
            scratchGui: {
                projectChanged: true
            }
        });

        Component = jest.fn(
            ({confirmReadyToReplaceProject, shouldSaveBeforeTransition}) => (
                <>
                    <div id="confirmReadyToReplaceProject">
                        {`${confirmReadyToReplaceProject()}`}
                    </div>
                    <div id="shouldSaveBeforeTransition">
                        {`${shouldSaveBeforeTransition()}`}
                    </div>
                </>
            )
        );
    });

    test('Logged in user who IS owner and HAS changed project will NOT be prompted to save', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canCreateNew
                canSave
                projectChanged
                // assume the user will click "cancel" on the confirm dialog
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        const element = container.querySelector('#confirmReadyToReplaceProject');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged in user who IS owner and has NOT changed project will NOT be prompted to save', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canCreateNew
                canSave
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                projectChanged={false}
                store={store}
            />
        );

        const element = container.querySelector('#confirmReadyToReplaceProject');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged in user who is NOT owner and HAS changed project will NOT be prompted to save', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canCreateNew
                projectChanged
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        const element = container.querySelector('#confirmReadyToReplaceProject');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged OUT user who HAS changed project WILL be prompted to save', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                projectChanged
                canCreateNew={false}
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                store={store}
            />
        );

        const element = container.querySelector('#confirmReadyToReplaceProject');
        expect(element).toHaveTextContent(/false/i);
    });

    test('Logged OUT user who has NOT changed project WILL NOT be prompted to save', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canCreateNew={false}
                canSave={false}
                confirmWithMessage={() => (false)} // eslint-disable-line react/jsx-no-bind
                projectChanged={false}
                store={store}
            />
        );
        const element = container.querySelector('#confirmReadyToReplaceProject');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged in user who IS owner and HAS changed project SHOULD save before transition to project page', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave
                projectChanged
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/true/i);
    });

    test('Logged in user who IS owner and has NOT changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave
                projectChanged={false}
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

    test('Logged in user who is NOT owner and HAS changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                projectChanged
                canSave={false}
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

    test('Logged in user who is NOT owner and has NOT changed project should NOT save before transition', () => {
        const WrappedComponent = MenuBarHOC(Component);
        const {container} = render(
            <WrappedComponent
                canSave={false}
                projectChanged={false}
                store={store}
            />
        );

        const element = container.querySelector('#shouldSaveBeforeTransition');
        expect(element).toHaveTextContent(/false/i);
    });

});
