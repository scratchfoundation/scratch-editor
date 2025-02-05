import React from 'react';
import ReactDOM from 'react-dom';
import GUI from './containers/gui';
import {AppStateProviderHOC} from './lib/app-state-provider-hoc';
import {EditorState} from './lib/editor-state';
import {ReactComponentLike} from 'prop-types';
import {compose} from 'redux';

export {EditorState, EditorStateParams} from './lib/editor-state';

export {setAppElement} from 'react-modal';

export * from './gui-config';
export * from './exported-reducers';

export * from 'scratch-storage';

export {default as buildDefaultProject} from './lib/default-project';

// TODO: Better typing once ScratchGUI has types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GUIProps = any; // ComponentPropsWithoutRef<typeof ScratchGUI>;

export type HigherOrderComponent = (component: ReactComponentLike) => ReactComponentLike;

/**
 * Creates a "root" for the editor to be hosted in.
 *
 * @param {EditorState} state The editor state. Create by new-ing EditorState.
 * @param {HTMLElement} container The container the editor should be hosted under.
 *
 * @returns {{ render: function(props: GUIProps): void, unmount: function(): void }} The mounted root.
 */
export const createStandaloneRoot = (
    state: EditorState,
    container: HTMLElement,
    {wrappers}: {wrappers?: HigherOrderComponent[]} = {}
) => {
    // note that redux's 'compose' function is just being used as a general utility to make
    // the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
    // ability to compose reducers.
    const WrappedGui = compose(
        AppStateProviderHOC,
        ...(wrappers ?? [])
    )(GUI) as ReactComponentLike;

    return {
        render (props: GUIProps) {
            ReactDOM.render(
                <WrappedGui
                    appState={state}
                    {...props}
                />,
                container
            );
        },

        unmount () {
            ReactDOM.unmountComponentAtNode(container);
        }
    };
};
