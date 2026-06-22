export interface Workspace {
  id: string;
  name: string;
  markdownText: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  slidesCount?: number;
}

export interface Slide {
  id: string;
  workspaceId: string;
  slideNumber: number;
  markdownContent: string;
  audioUrl?: string;
  title?: string;
  canvasData?: string;
  activeEditor?: "MARKDOWN" | "CANVAS";
}

export interface RevisionShort {
  id: string;
  text: string;
  category: string;
}
