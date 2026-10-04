export const CONTENT_FORMATS = new Set(["article", "note"]);

export function isNotePost(post) {
  return post?.format === "note";
}

export function filterNotePosts(posts) {
  return posts.filter(isNotePost);
}

export function filterWritingPosts(posts) {
  return posts.filter((post) => !isNotePost(post));
}
