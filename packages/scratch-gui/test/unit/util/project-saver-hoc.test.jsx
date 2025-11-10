import 'web-audio-test-api';

import React from 'react';
import configureStore from 'redux-mock-store';
import {render} from '@testing-library/react';
import {LoadingState} from '../../../src/reducers/project-state';
import VM from '@scratch/scratch-vm';
import {legacyConfig} from '../../../src/legacy-config';

import projectSaverHOC from '../../../src/lib/project-saver-hoc.jsx';
import '@testing-library/jest-dom';

describe('projectSaverHOC', () => {
    const mockStore = configureStore();
    let store;
    let vm;

    beforeEach(() => {
        store = mockStore({
            scratchGui: {
                config: legacyConfig,
                projectChanged: false,
                projectState: {},
                projectTitle: 'Scratch Project',
                timeout: {
                    autoSaveTimeoutId: null
                }
            },
            locales: {
                locale: 'en'
            }
        });
        vm = new VM();
        jest.useFakeTimers();
    });

    test('if canSave becomes true when showing a project with an id, project will be saved', () => {
        const mockedUpdateProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                isShowingWithId
                canSave={false}
                isCreatingNew={false}
                isShowingSaveable={false} // set explicitly because it relies on ownProps.canSave
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedUpdateProject}
            />
        );
        rerender(
            <WrappedComponent
                isShowingWithId
                canSave
                isCreatingNew={false}
                isShowingSaveable // set explicitly because it relies on ownProps.canSave
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedUpdateProject}
            />
        );
        expect(mockedUpdateProject).toHaveBeenCalled();
    });

    test('if canSave is already true and we show a project with an id, project will NOT be saved', () => {
        const mockedSaveProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                canSave
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedSaveProject}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isCreatingNew={false}
                isShowingWithId
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedSaveProject}
            />
        );
        expect(mockedSaveProject).not.toHaveBeenCalled();
    });

    test('if canSave is false when showing a project without an id, project will NOT be created', () => {
        const mockedCreateProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                isShowingWithoutId
                canSave={false}
                isCreatingNew={false}
                isShowingWithId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_NEW_DEFAULT}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        rerender(
            <WrappedComponent
                isShowingWithoutId
                canSave={false}
                isCreatingNew={false}
                isShowingWithId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_NEW_DEFAULT}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        expect(mockedCreateProject).not.toHaveBeenCalled();
    });

    test('if canCreateNew becomes true when showing a project without an id, project will be created', () => {
        const mockedCreateProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                isShowingWithoutId
                canCreateNew={false}
                isCreatingNew={false}
                isShowingWithId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITHOUT_ID}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        rerender(
            <WrappedComponent
                isShowingWithoutId
                canCreateNew
                isCreatingNew={false}
                isShowingWithId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITHOUT_ID}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        expect(mockedCreateProject).toHaveBeenCalled();
    });

    test('if canCreateNew is true and we transition to showing new project, project will be created', () => {
        const mockedCreateProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                canCreateNew
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_NEW_DEFAULT}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        rerender(
            <WrappedComponent
                canCreateNew
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITHOUT_ID}
                store={store}
                vm={vm}
                onCreateProject={mockedCreateProject}
            />
        );
        expect(mockedCreateProject).toHaveBeenCalled();
    });

    test('if we enter creating new state, vm project should be requested', () => {
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        // The first wrapper is redux's Connect HOC
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                canSave
                isCreatingCopy={false}
                isCreatingNew={false}
                isRemixing={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_NEW_DEFAULT}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isCreatingCopy={false}
                isCreatingNew
                isRemixing={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.CREATING_NEW}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
            />
        );
        expect(mockedStoreProject).toHaveBeenCalled();
    });

    test('if we enter remixing state, vm project should be requested, and alert should show', () => {
        const mockedShowCreatingRemixAlert = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        // The first wrapper is redux's Connect HOC
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                canSave
                isCreatingCopy={false}
                isCreatingNew={false}
                isRemixing={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
                onShowCreatingRemixAlert={mockedShowCreatingRemixAlert}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isCreatingCopy={false}
                isCreatingNew={false}
                isRemixing
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.REMIXING}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
                onShowCreatingRemixAlert={mockedShowCreatingRemixAlert}
            />
        );
        expect(mockedStoreProject).toHaveBeenCalled();
        expect(mockedShowCreatingRemixAlert).toHaveBeenCalled();
    });

    test('if we enter creating copy state, vm project should be requested, and alert should show', () => {
        const mockedShowCreatingCopyAlert = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        // The first wrapper is redux's Connect HOC
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                canSave
                isCreatingCopy={false}
                isCreatingNew={false}
                isRemixing={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
                onShowCreatingCopyAlert={mockedShowCreatingCopyAlert}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isCreatingCopy
                isCreatingNew={false}
                isRemixing={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.CREATING_COPY}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
                onShowCreatingCopyAlert={mockedShowCreatingCopyAlert}
            />
        );
        expect(mockedStoreProject).toHaveBeenCalled();
        expect(mockedShowCreatingCopyAlert).toHaveBeenCalled();
    });

    test('if we enter updating/saving state, vm project should be requested', () => {
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        // The first wrapper is redux's Connect HOC
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                canSave
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating={false}
                loadingState={LoadingState.LOADING_VM_WITH_ID}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                isUpdating
                loadingState={LoadingState.MANUAL_UPDATING}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
            />
        );
        expect(mockedStoreProject).toHaveBeenCalled();
    });

    test('if we are already in updating/saving state, vm project ' +
        'should NOT requested, alert should NOT show', () => {
        const mockedShowCreatingAlert = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        // The first wrapper is redux's Connect HOC
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                canSave
                isUpdating
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                loadingState={LoadingState.MANUAL_UPDATING}
                reduxProjectId={'100'}
                store={store}
                vm={vm}
                onShowCreatingAlert={mockedShowCreatingAlert}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isUpdating
                isCreatingNew={false}
                isShowingWithId={false}
                isShowingWithoutId={false}
                loadingState={LoadingState.AUTO_UPDATING}
                reduxProjectId={'99'}
                store={store}
                vm={vm}
                onShowCreatingAlert={mockedShowCreatingAlert}
            />
        );
        expect(mockedStoreProject).not.toHaveBeenCalled();
        expect(mockedShowCreatingAlert).not.toHaveBeenCalled();
    });

    test('if user saves, inline saving alert should show', () => {
        const mockedShowSavingAlert = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                canSave
                isShowingWithoutId
                canCreateNew={false}
                isCreatingNew={false}
                isManualUpdating={false}
                isShowingWithId={false}
                isUpdating={false}
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onShowSavingAlert={mockedShowSavingAlert}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingWithoutId
                canCreateNew={false}
                isCreatingNew={false}
                isManualUpdating
                isShowingWithId={false}
                isUpdating
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onShowSavingAlert={mockedShowSavingAlert}
            />
        );
        expect(mockedShowSavingAlert).toHaveBeenCalled();
    });

    test('if project is changed, it should autosave after interval', () => {
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedAutoUpdate = jest.fn(() => Promise.resolve());
        const {rerender} = render(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
                projectChanged
            />
        );
        // Fast-forward until all timers have been executed
        jest.runAllTimers();
        expect(mockedAutoUpdate).toHaveBeenCalled();
    });

    test('if project is changed several times in a row, it should only autosave once', () => {
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedAutoUpdate = jest.fn(() => Promise.resolve());
        const {rerender} = render(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
                projectChanged
                reduxProjectTitle="a"
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
                projectChanged
                reduxProjectTitle="b"
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
                projectChanged
                reduxProjectTitle="c"
            />
        );
        // Fast-forward until all timers have been executed
        jest.runAllTimers();
        expect(mockedAutoUpdate).toHaveBeenCalledTimes(1);
    });

    test('if project is not changed, it should not autosave after interval', () => {
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        const mockedAutoUpdate = jest.fn(() => Promise.resolve());
        const {rerender} = render(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
            />
        );
        rerender(
            <WrappedComponent
                canSave
                isShowingSaveable
                isShowingWithId
                loadingState={LoadingState.SHOWING_WITH_ID}
                store={store}
                vm={vm}
                onAutoUpdateProject={mockedAutoUpdate}
                projectChanged={false}
            />
        );
        // Fast-forward until all timers have been executed
        jest.runAllTimers();
        expect(mockedAutoUpdate).not.toHaveBeenCalled();
    });

    test('when starting to remix, onRemixing should be called with param true', () => {
        const mockedOnRemixing = jest.fn();
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                isRemixing={false}
                store={store}
                vm={vm}
                onRemixing={mockedOnRemixing}
            />
        );
        rerender(
            <WrappedComponent
                isRemixing
                store={store}
                vm={vm}
                onRemixing={mockedOnRemixing}
            />
        );
        expect(mockedOnRemixing).toHaveBeenCalledWith(true);
    });

    test('when starting to remix, onRemixing should be called with param false', () => {
        const mockedOnRemixing = jest.fn();
        const mockedStoreProject = jest.fn(() => Promise.resolve());
        const Component = () => <div />;
        const WrappedComponent = projectSaverHOC(Component);
        WrappedComponent.WrappedComponent.prototype.storeProject = mockedStoreProject;
        const {rerender} = render(
            <WrappedComponent
                isRemixing
                store={store}
                vm={vm}
                onRemixing={mockedOnRemixing}
            />
        );
        rerender(
            <WrappedComponent
                isRemixing={false}
                store={store}
                vm={vm}
                onRemixing={mockedOnRemixing}
            />
        );
        expect(mockedOnRemixing).toHaveBeenCalledWith(false);
    });

    test('uses onSetProjectThumbnailer on mount/unmount', () => {
        const Component = ({onSetProjectThumbnailer}) => (
            <div id="onSetProjectThumbnailer">{`${onSetProjectThumbnailer ?
                onSetProjectThumbnailer() :
                onSetProjectThumbnailer
            }`}</div>
        );
        const WrappedComponent = projectSaverHOC(Component);
        const setThumb = jest.fn();
        const {container, unmount} = render(
            <WrappedComponent
                store={store}
                vm={vm}
                onSetProjectThumbnailer={setThumb}
            />
        );
        // Set project thumbnailer should be called on mount
        expect(setThumb).toHaveBeenCalledTimes(1);

        // And it should not pass that function on to wrapped element
        const element = container.querySelector('#onSetProjectThumbnailer');
        expect(element).toHaveTextContent(/undefined/i);

        // Unmounting should call it again with null
        unmount();
        expect(setThumb).toHaveBeenCalledTimes(2);
        expect(setThumb.mock.calls[1][0]).toBe(null);
    });

    test('uses onSetProjectSaver on mount/unmount', () => {
        const Component = ({onSetProjectSaver}) => (
            <div id="onSetProjectSaver">{`${onSetProjectSaver ? onSetProjectSaver() : onSetProjectSaver
            }`}</div>
        );
        const WrappedComponent = projectSaverHOC(Component);
        const setSaver = jest.fn();
        const {container, unmount} = render(
            <WrappedComponent
                store={store}
                vm={vm}
                onSetProjectSaver={setSaver}
            />
        );
        // Set project saver should be called on mount
        expect(setSaver).toHaveBeenCalledTimes(1);

        // And it should not pass that function on to wrapped element
        const element = container.querySelector('#onSetProjectSaver');
        expect(element).toHaveTextContent(/undefined/i);

        // Unmounting should call it again with null
        unmount();
        expect(setSaver).toHaveBeenCalledTimes(2);
        expect(setSaver.mock.calls[1][0]).toBe(null);
    });
});
