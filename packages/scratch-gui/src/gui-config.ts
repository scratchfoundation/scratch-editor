import PropTypes from 'prop-types';
import {ScratchStorage} from 'scratch-storage';

export type GUIConfigFactory = () => GUIConfig;
export type ProjectId = string | number;

export interface GUIConfig {
    storage: GUIStorage;
}

export interface GUIStorage {
    scratchStorage: ScratchStorage;

    // Called multiple times (as changes happen)
    setProjectHost?(host: string): void;
    setProjectToken?(token: string): void;
    setProjectMetadata?(projectId: string | null | undefined): void;
    setAssetHost?(host: string): void;
    setTranslatorFunction?(formatMessageFn: TranslatorFunction): void;
    setBackpackHost?(host: string): void;

    saveProject(
        projectId: ProjectId | null | undefined,
        vmState: string,
        params: {
            originalId?: ProjectId;
            isCopy?: boolean | 1;
            isRemix?: boolean | 1;
            title?: string;
        }
    ): Promise<{ id: ProjectId }>;

    saveProjectThumbnail?(projectId: ProjectId, thumbnail: Blob): void;

    // TODO: Support backpack storage
}

export type TranslatorFunction = (
    msgObj: MessageObject,
    options?: { index: number }
) => string;

export interface MessageObject {
    id: string;
    description: string;
    defaultMessage: string;
}

export const GUIStoragePropType = PropTypes.shape({
    scratchStorage: PropTypes.object.isRequired,

    setProjectHost: PropTypes.func,
    setProjectToken: PropTypes.func,
    setProjectMetadata: PropTypes.func,
    setAssetHost: PropTypes.func,
    setTranslatorFunction: PropTypes.func,
    setBackpackHost: PropTypes.func,

    saveProject: PropTypes.func.isRequired,

    saveProjectThumbnail: PropTypes.func
});
