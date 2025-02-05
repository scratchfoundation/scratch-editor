import {GUIConfig} from './gui-config';
import {LegacyStorage} from './lib/legacy-storage';

export const legacyConfig: GUIConfig = {
    storage: new LegacyStorage()
};
