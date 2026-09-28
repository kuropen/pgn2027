type Brand = {
  readonly brand: string;
  readonly version: string;
};

interface NavigatorUAData {
  readonly brands: Brand[];
  readonly mobile: boolean;
  readonly platform: string;
  getHighEntropyValues<K extends Hints>(hints: K[]): Promise<NavigatorUADataWithHighEntropy<typeof hints[number]>>;
  toJSON(): string;
};

type HighEntropyUAData = {
  readonly architecture: string;
  readonly bitness: string;
  readonly formFactor: string;
  readonly fullVersionList: Brand[]
  readonly model: string;
  readonly platformVersion: string;
  readonly wow64: boolean;
}
type Hints = keyof HighEntropyUAData;

type NavigatorUADataWithHighEntropy<K extends Hints> = 
  Omit<NavigatorUAData, "getHighEntropyValues" | "toJSON"> & Pick<HighEntropyUAData, K>;

interface Navigator {
  /**
   * User-Agent Client Hints.
   * NOTE: Only available in Chromium-based browsers. This will be `undefined` in WebKit and Mozilla.
   * @see https://wicg.github.io/ua-client-hints/
   */
  readonly userAgentData?: NavigatorUAData;
}
