// frontend/src/types.ts

export interface Tag {
  id: number;
  name: string;
}

export interface Folder {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  url: string;
  folder_id?: number | null;
  folder?: Folder | null;
  tags: Tag[];
  created_at: string; // ISO形式の文字列として受け取る

  // バックエンドで追加した新しいフィールド
  tweet_id?: string | null;
  text?: string | null;
  author_name?: string | null;
  author_screen_name?: string | null;
  author_avatar_url?: string | null;
  posted_at?: string | null; // ISO形式の文字列として受け取る
  media_urls?: string[] | null; // URLの配列
  favorite_count?: number; // FastAPI側でdefault=0にしているので、ここではOptional
  embed_html?: string | null;
}

export interface FolderWithPosts extends Folder {
  posts: Post[];
}

// APIからの作成時に使用する型
export interface PostCreate {
  url: string;
  folder_id?: number | null;
  tags?: string[]; // タグ名を文字列の配列で渡す
}