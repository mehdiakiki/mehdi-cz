export type ContactRow = Readonly<{
  rowNumber: number;
  email: string;
}>;

export type Duplicate = Readonly<{
  rowNumber: number;
  firstRowNumber: number;
}>;

export type DeduplicationResult = {
  unique: ContactRow[];
  duplicates: Duplicate[];
};
