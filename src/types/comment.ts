/**
 * コメント・Q&A型定義
 */

// ============================================
// 基本型定義
// ============================================

export const COMMENT_TARGET_TYPES = {
  TEST_RUN_CASE: 'TEST_RUN_CASE',
  TEST_RESULT: 'TEST_RESULT',
  TEST_CASE: 'TEST_CASE',
  TEST_SPEC: 'TEST_SPEC',
} as const;

export type CommentTargetType = keyof typeof COMMENT_TARGET_TYPES;

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface CommentMention {
  id: string;
  commentId: string;
  userId: string;
  user?: CommentAuthor;
  createdAt: string;
}

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  authorId: string;
  author?: CommentAuthor;
  content: string;
  isEdited: boolean;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  replies?: Comment[];
  mentions?: CommentMention[];
}

// ============================================
// 入力型定義
// ============================================

export interface CreateCommentInput {
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string | null;
  content: string;
  mentionUserIds?: string[];
}

export interface UpdateCommentInput {
  content: string;
  mentionUserIds?: string[];
}

export interface ResolveCommentInput {
  isResolved: boolean;
}

// ============================================
// バリデーション定数
// ============================================

export const COMMENT_CONTENT_MIN_LENGTH = 1;
export const COMMENT_CONTENT_MAX_LENGTH = 5000;

// ============================================
// バリデーション関数
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCommentContent(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'コメント内容は必須です。' };
  }
  if (content.trim().length < COMMENT_CONTENT_MIN_LENGTH) {
    return {
      valid: false,
      error: `コメントは${COMMENT_CONTENT_MIN_LENGTH}文字以上で入力してください。`,
    };
  }
  if (content.length > COMMENT_CONTENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `コメントは${COMMENT_CONTENT_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

export function validateTargetType(targetType: string): ValidationResult {
  if (!Object.keys(COMMENT_TARGET_TYPES).includes(targetType)) {
    return { valid: false, error: '無効な対象タイプです。' };
  }
  return { valid: true };
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * コメント内容からメンションを抽出
 * @example "@user@example.com" または "@username" 形式
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\S+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  return matches.map((m) => m.slice(1)); // @ を除去
}

/**
 * コメントをスレッド構造に変換
 */
export function buildCommentThreads(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const roots: Comment[] = [];

  // まずすべてのコメントをマップに登録
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // 親子関係を構築
  comments.forEach((comment) => {
    const mappedComment = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(mappedComment);
      }
    } else {
      roots.push(mappedComment);
    }
  });

  return roots;
}

/**
 * コメント数をカウント（返信含む）
 */
export function countTotalComments(comments: Comment[]): number {
  let count = 0;
  const countRecursive = (items: Comment[]) => {
    items.forEach((item) => {
      count++;
      if (item.replies && item.replies.length > 0) {
        countRecursive(item.replies);
      }
    });
  };
  countRecursive(comments);
  return count;
}
