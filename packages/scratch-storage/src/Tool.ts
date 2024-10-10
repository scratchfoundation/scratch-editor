export type ScratchGetRequest = {url: string} & RequestInit;
export type ScratchSendRequest = {url: string, withCredentials?: boolean} & RequestInit;

export interface Tool {
  get isGetSupported (): boolean;
  get (request: ScratchGetRequest): Promise<Uint8Array | null>;

  get isSendSupported (): boolean;
  send (request: ScratchSendRequest): Promise<string>;
}
