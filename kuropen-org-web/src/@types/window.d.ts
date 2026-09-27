type Brand = {
  readonly brand: string;
  readonly version: string;
};

interface NavigatorUAData {
  readonly brands: Brand[];
  readonly mobile: boolean;
  readonly platform: string;
  getHighEntropyValues(hints: string[]): Promise<NavigatorUADataWithHighEntropy>;
};

type NavigatorUADataWithHighEntropy = {
  readonly brands: Brand[];
  readonly mobile: boolean;
  readonly platform: string;
  readonly architecture?: string;
  readonly bitness?: string;
  readonly formFactor?: string;
  readonly fullVersionList?: Brand[]
  readonly model?: string;
  readonly platformVersion?: string;
  readonly wow64?: string;
};

interface Navigator {
  userAgentData: NavigatorUAData;
}