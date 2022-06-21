export type Bundle = {
  fromHeight: number;
  toHeight: number;
  bundle: any[];
  toKey: string;
  toValue: string;
};

export type Item = {
  key: string;
  previousKey: string;
  value: any;
};
