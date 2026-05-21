import {SerializableData, BackpackItemType} from '../../gui-config';

/**
 * The shape of a backpack payload as returned by the existing payload functions
 * (costume-payload, sound-payload, sprite-payload, code-payload)
 */
export interface BackpackPayload {
    type: BackpackItemType;
    name: string;
    mime: string;
    body: string;
    thumbnail: string;
}

/**
 * Adapter class that wraps an existing payload object to implement the SerializableData interface.
 * This allows the legacy payload functions to be used with the new GUIBackpackStorage interface.
 */
export class PayloadSerializableData implements SerializableData {
    private payload: BackpackPayload;

    constructor (payload: BackpackPayload) {
        this.payload = payload;
    }

    mimeType (): string {
        return this.payload.mime;
    }

    dataAsBase64 (): Promise<string> {
        return Promise.resolve(this.payload.body);
    }

    thumbnailAsBase64 (): Promise<string> {
        return Promise.resolve(this.payload.thumbnail);
    }

    /**
     * Returns the type of the backpack item
     */
    getType (): BackpackItemType {
        return this.payload.type;
    }

    /**
     * Returns the name of the backpack item
     */
    getName (): string {
        return this.payload.name;
    }
}
