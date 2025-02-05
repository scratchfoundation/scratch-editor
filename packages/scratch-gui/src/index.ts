import {buildInitialState} from './reducers/gui';
import {legacyConfig} from './legacy-config';

export {default} from './containers/gui.jsx';
export {default as AppStateHOC} from './lib/app-state-hoc.jsx';
export {remixProject} from './reducers/project-state.js';
export {setAppElement} from 'react-modal';

export {legacyConfig};
export const guiInitialState = buildInitialState(legacyConfig);

export * from './exported-reducers';
