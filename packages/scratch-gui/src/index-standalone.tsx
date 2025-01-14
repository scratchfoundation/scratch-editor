import React from 'react';
import ReactDOM from 'react-dom';
import GUI from './containers/gui';
import {AppStateProviderHOC} from './lib/app-state-provider-hoc';
import {EditorState} from './lib/editor-state';

export {EditorState, EditorStateParams} from './lib/editor-state';

export {setAppElement} from 'react-modal';

export * from './gui-config';
export * from './exported-reducers';

export * from 'scratch-storage';

export {default as buildDefaultProject} from './lib/default-project';

// TODO: Better typing once ScratchGUI has types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GUIProps = any; // ComponentPropsWithoutRef<typeof ScratchGUI>;

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
    container: HTMLElement
) => {
    const GUIWithState = AppStateProviderHOC(GUI);

    return {
        render (props: GUIProps) {
            ReactDOM.render(
                <GUIWithState
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
