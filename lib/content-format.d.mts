export type FormattedPost = {
  format?: "article" | "note" | string | null;
};

export declare const CONTENT_FORMATS: ReadonlySet<string>;
export declare function isNotePost(post: FormattedPost | null | undefined): boolean;
export declare function filterNotePosts<T extends FormattedPost>(posts: T[]): T[];
export declare function filterWritingPosts<T extends FormattedPost>(posts: T[]): T[];
