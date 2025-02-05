import VM from '@scratch/scratch-vm';
import {GUIConfig} from '../gui-config';

const SET_VM = 'scratch-gui/vm/SET_VM';

const createVM = function (config: GUIConfig) {
    const defaultVM = new VM();
    defaultVM.attachStorage(config.storage.scratchStorage);
    return defaultVM;
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = null;
    switch (action.type) {
    case SET_VM:
        return action.vm;
    default:
        return state;
    }
};
const setVM = function (vm) {
    return {
        type: SET_VM,
        vm: vm
    };
};

export {
    reducer as default,
    createVM as vmInitialState,
    setVM
};
