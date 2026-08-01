export type DictionaryShape<T> = {
  [Key in keyof T]: T[Key] extends string
    ? string
    : T[Key] extends readonly string[]
      ? readonly string[]
      : DictionaryShape<T[Key]>;
};
