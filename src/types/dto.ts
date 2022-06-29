export interface DataItem {
  key: string;
  value: any;
}

export interface Bundle {
  fromHeight: number;
  toHeight: number;
  bundle: any[];
  toKey: string;
  toValue: string;
}
