export enum UserRole {
  STUDENT = "STUDENT",
  STAFF = "STAFF",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
  UNDISCLOSED = "UNDISCLOSED",
}

export interface User {
  id: string;
  email: string;
  username: string;
  studentId?: string;
  fullName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  gender: Gender;
  role: UserRole;
  faculty?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  isOfficial: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
}

export interface PostTagMap {
  postId: string;
  tagId: string;
  tag: Tag;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  groupId?: string;
  group?: Group;
  title?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  media: PostMedia[];
  comments: Comment[];
  reactions: PostReaction[];
  tags: PostTagMap[];
  _count?: {
    comments: number;
    reactions: number;
  };
}

export interface PostMedia {
  id: string;
  postId: string;
  mediaType: "IMAGE" | "VIDEO" | "FILE";
  url: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface PostReaction {
  postId: string;
  userId: string;
  reaction: "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  body?: string;
  attachmentUrl?: string;
  createdAt: string;
}
