/* global WebAudioTestAPI */
import 'web-audio-test-api';
WebAudioTestAPI.setState({
    'AudioContext#resume': 'enabled'
});

import React from 'react';
import configureStore from 'redux-mock-store';
import {render} from '@testing-library/react';
import VM from '@scratch/scratch-vm';
import {LoadingState} from '../../../src/reducers/project-state';

import vmManagerHOC from '../../../src/lib/vm-manager-hoc.jsx';

describe('VMManagerHOC', () => {
    const mockStore = configureStore();
    let store;
    let vm;

    beforeEach(() => {
        store = mockStore({
            scratchGui: {
                projectState: {},
                mode: {},
                vmStatus: {}
            },
            locales: {
                locale: '',
                messages: {}
            }
        });
        vm = new VM();
        vm.attachAudioEngine = jest.fn();
        vm.setCompatibilityMode = jest.fn();
        vm.setLocale = jest.fn();
        vm.start = jest.fn();
    });
    test('when it mounts in player mode, the vm is initialized but not started', () => {
        const Component = () => (<div />);
        const WrappedComponent = vmManagerHOC(Component);
        render(
            <WrappedComponent
                isPlayerOnly
                isStarted={false}
                store={store}
                vm={vm}
            />
        );
        expect(vm.attachAudioEngine.mock.calls.length).toBe(1);
        expect(vm.setCompatibilityMode.mock.calls.length).toBe(1);
        expect(vm.setLocale.mock.calls.length).toBe(1);
        expect(vm.initialized).toBe(true);

        // But vm should not be started automatically
        expect(vm.start).not.toHaveBeenCalled();
    });
    test('when it mounts in editor mode, the vm is initialized and started', () => {
        const Component = () => (<div />);
        const WrappedComponent = vmManagerHOC(Component);
        render(
            <WrappedComponent
                isPlayerOnly={false}
                isStarted={false}
                store={store}
                vm={vm}
            />
        );
        expect(vm.attachAudioEngine.mock.calls.length).toBe(1);
        expect(vm.setCompatibilityMode.mock.calls.length).toBe(1);
        expect(vm.setLocale.mock.calls.length).toBe(1);
        expect(vm.initialized).toBe(true);

        expect(vm.start).toHaveBeenCalled();
    });
    test('if it mounts with an initialized vm, it does not reinitialize the vm but will start it', () => {
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        vm.initialized = true;
        render(
            <WrappedComponent
                isPlayerOnly={false}
                isStarted={false}
                store={store}
                vm={vm}
            />
        );
        expect(vm.attachAudioEngine.mock.calls.length).toBe(0);
        expect(vm.setCompatibilityMode.mock.calls.length).toBe(0);
        expect(vm.setLocale.mock.calls.length).toBe(0);
        expect(vm.initialized).toBe(true);

        expect(vm.start).toHaveBeenCalled();
    });

    test('if it mounts without starting the VM, it can be started by switching to editor mode', () => {
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        vm.initialized = true;
        const {rerender} = render(
            <WrappedComponent
                isPlayerOnly
                isStarted={false}
                store={store}
                vm={vm}
            />
        );
        expect(vm.start).not.toHaveBeenCalled();
        rerender(
            <WrappedComponent
                isPlayerOnly={false}
                isStarted={false}
                store={store}
                vm={vm}
            />
        );
        expect(vm.start).toHaveBeenCalled();
    });
    test('if it mounts with an initialized and started VM, it does not start again', () => {
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        vm.initialized = true;
        const {rerender} = render(
            <WrappedComponent
                isPlayerOnly
                isStarted
                store={store}
                vm={vm}
            />
        );
        expect(vm.start).not.toHaveBeenCalled();
        rerender(
            <WrappedComponent
                isPlayerOnly={false}
                isStarted
                store={store}
                vm={vm}
            />
        );
        expect(vm.start).not.toHaveBeenCalled();
    });
    test('if the isLoadingWithId prop becomes true, it loads project data into the vm', () => {
        vm.loadProject = jest.fn(() => Promise.resolve());
        const mockedOnLoadedProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                fontsLoaded
                isLoadingWithId={false}
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
            />
        );
        rerender(
            <WrappedComponent
                fontsLoaded
                isLoadingWithId
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
                canSave
                loadingState={LoadingState.LOADING_VM_WITH_ID}
                projectData="100"
            />
        );
        expect(vm.loadProject).toHaveBeenLastCalledWith('100');
        // delay needed since vm.loadProject is async, and we have to wait for it :/
        setTimeout(() => (
            expect(mockedOnLoadedProject).toHaveBeenLastCalledWith(LoadingState.LOADING_VM_WITH_ID, true)
        ), 1);
    });
    test('if the fontsLoaded prop becomes true, it loads project data into the vm', () => {
        vm.loadProject = jest.fn(() => Promise.resolve());
        const mockedOnLoadedProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                isLoadingWithId
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
            />
        );
        rerender(
            <WrappedComponent
                isLoadingWithId
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
                canSave={false}
                fontsLoaded
                loadingState={LoadingState.LOADING_VM_WITH_ID}
                projectData="100"
            />
        );
        expect(vm.loadProject).toHaveBeenLastCalledWith('100');
        // delay needed since vm.loadProject is async, and we have to wait for it :/
        setTimeout(() => (
            expect(mockedOnLoadedProject).toHaveBeenLastCalledWith(LoadingState.LOADING_VM_WITH_ID, false)
        ), 1);
    });
    test('if the fontsLoaded prop is false, project data is never loaded', () => {
        vm.loadProject = jest.fn(() => Promise.resolve());
        const mockedOnLoadedProject = jest.fn();
        const Component = () => <div />;
        const WrappedComponent = vmManagerHOC(Component);
        const {rerender} = render(
            <WrappedComponent
                isLoadingWithId
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
            />
        );
        rerender(
            <WrappedComponent
                isLoadingWithId
                store={store}
                vm={vm}
                onLoadedProject={mockedOnLoadedProject}
                loadingState={LoadingState.LOADING_VM_WITH_ID}
                projectData="100"
            />
        );
        expect(vm.loadProject).toHaveBeenCalledTimes(0);
        // delay needed since vm.loadProject is async
        setTimeout(() => expect(mockedOnLoadedProject).toHaveBeenCalledTimes(0), 1);
    });
});
