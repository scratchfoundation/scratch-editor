import xhr from 'xhr';
import {ScratchStorage, Asset} from 'scratch-storage';
import {
    GUIBackpackStorage,
    BackpackListItemsInput,
    BackpackSaveItemInput,
    BackpackItem,
    BackpackSession,
    SerializableData
} from '../gui-config';

type BackpackItemWithoutUrls = Omit<BackpackItem, 'thumbnailUrl' | 'bodyUrl'>;

// Add a new property for the full thumbnail url, which includes the host.
// Also include a full body url for loading sprite zips
// TODO retreiving the images through storage would allow us to remove this.
const includeFullUrls = (item: BackpackItemWithoutUrls, host: string): BackpackItem => ({
    ...item,
    thumbnailUrl: `${host}/${item.thumbnail}`,
    bodyUrl: `${host}/${item.body}`
});

export interface LegacyBackpackStorageConfig {
    /**
     * Reads the current authentication session - necessary for making a backpack request.
     *
     * It can be called with a missing session if the session was not set on the Redux store.
     * In general, the session will be missing when the Standalone version of the editor is used.
     */
    readAuth(session: BackpackSession | null | undefined): Promise<LegacyBackpackAuth>
}

export interface LegacyBackpackAuth {
    /**
     * The username of the user. This is part of the request URL so it's mandatory
     */
    username: string,

    /**
     * The authentication type - only these two are supported by this backpack service.
     */
    authType: 'x-token' | 'jwt'

    /**
     * The token to be provided as authentication
     */
    authToken: string
}

export class LegacyBackpackStorage implements GUIBackpackStorage {
    private host?: string;
    private webStoreRegistered = false;
    private session: BackpackSession | null | undefined = null;

    constructor (
        private config: LegacyBackpackStorageConfig
    ) {}

    /**
     * Set the session for backpack API requests.
     *
     * This is only used by the non-standalone version of the editor, where the session
     * is taken directly from scratch-www's Redux store. In all other cases this will be
     * missing.
     */
    setSession (session: BackpackSession | null | undefined): void {
        this.session = session;
    }

    // TODO: This is unsafe to call multiple times. It's fine in our usages for now, but should
    //       maybe be updated to remove the old webStore setting before adding the new one
    setHostAndRegisterWebStore (host: string, scratchStorage: ScratchStorage): void {
        this.host = host;

        if (!this.webStoreRegistered) {
            const AssetType = scratchStorage.AssetType;
            scratchStorage.addWebStore(
                [AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound],
                this.getBackpackAssetURL.bind(this)
            );
            this.webStoreRegistered = true;
        }
    }

    async list (request: BackpackListItemsInput): Promise<BackpackItem[]> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        const auth = await this.config.readAuth(this.session);

        return new Promise((resolve, reject) => {
            xhr({
                method: 'GET',
                uri: `${host}/${auth.username}?limit=${request.limit}&offset=${request.offset}`,
                headers: auth.authType === 'x-token' ?
                    {'x-token': auth.authToken} :
                    {Authorization: `Bearer ${auth.authToken}`},
                json: true
            }, (error, response) => {
                if (error || response.statusCode !== 200) {
                    return reject(new Error(String(response.statusCode)));
                }
                const items = response.body as BackpackItemWithoutUrls[];
                return resolve(items.map(item => includeFullUrls(item, host)));
            });
        });
    }

    async save (item: BackpackSaveItemInput, data: SerializableData): Promise<BackpackItem> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        const auth = await this.config.readAuth(this.session);

        return Promise.all([
            data.dataAsBase64(),
            data.thumbnailAsBase64()
        ]).then(([body, thumbnail]) => new Promise<BackpackItem>((resolve, reject) => {
            xhr({
                method: 'POST',
                uri: `${host}/${auth.username}`,
                headers: auth.authType === 'x-token' ?
                    {'x-token': auth.authToken} :
                    {Authorization: `Bearer ${auth.authToken}`},
                json: {
                    type: item.type,
                    mime: data.mimeType(),
                    name: item.name,

                    body,
                    thumbnail
                } as any // The type of the json param is wrong
            }, (error, response) => {
                if (error || response.statusCode !== 200) {
                    return reject(new Error(String(response.statusCode)));
                }
                return resolve(includeFullUrls(response.body as BackpackItemWithoutUrls, host));
            });
        }));
    }

    async delete (id: string): Promise<void> {
        const host = this.host;
        if (!host) {
            return Promise.reject(new Error('Backpack host not set'));
        }

        const auth = await this.config.readAuth(this.session);

        return new Promise((resolve, reject) => {
            xhr({
                method: 'DELETE',
                uri: `${host}/${auth.username}/${id}`,
                headers: auth.authType === 'x-token' ?
                    {'x-token': auth.authToken} :
                    {Authorization: `Bearer ${auth.authToken}`}
            }, (error, response) => {
                if (error || response.statusCode !== 200) {
                    return reject(new Error(String(response.statusCode)));
                }
                return resolve();
            });
        });
    }

    private getBackpackAssetURL (asset: Asset): string {
        return `${this.host}/${asset.assetId}.${asset.dataFormat}`;
    }
}
