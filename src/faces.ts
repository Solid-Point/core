export type Bundle = {
  fromHeight: number;
  toHeight: number;
  bundle: any[];
  latestKey: string;
  latestValue: string;
};

export type Item = {
  key: string;
  value: any;
};
