import type { ReactNode } from 'react';
import { BookOpen, Boxes, Factory, PlayCircle, Settings2, Sparkles, Terminal } from 'lucide-react';

type DocsBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; content: string }
  | { type: 'code'; code: string };

type DocsSection = {
  id: string;
  title: string;
  blocks: DocsBlock[];
};

export type DocsPageDefinition = {
  category: string;
  slug: string;
  groupLabel: string;
  navLabel: string;
  title: string;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  sections: DocsSection[];
};

export type DocsContent = {
  sidebarEyebrow: string;
  sidebarTitle: string;
  sidebarDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  footerLabel: string;
  footerCurrent: string;
  pages: DocsPageDefinition[];
};

type DocsMessages = {
  sidebarEyebrow: string;
  sidebarTitle: string;
  sidebarDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  footerLabel: string;
  footerCurrent: string;
  pages: DocsPageDefinition[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function expectString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function expectStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function getPageIcon(slug: string) {
  switch (slug) {
    case 'introduction':
      return <BookOpen className="h-4 w-4" />;
    case 'quick-start':
      return <Terminal className="h-4 w-4" />;
    case 'features':
      return <Sparkles className="h-4 w-4" />;
    case 'lifecycle':
      return <Boxes className="h-4 w-4" />;
    case 'creator-flow':
      return <Factory className="h-4 w-4" />;
    case 'collector-flow':
      return <PlayCircle className="h-4 w-4" />;
    case 'configuration':
      return <Settings2 className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
}

function parseBlock(block: unknown): DocsBlock | null {
  if (!isRecord(block)) return null;

  const type = expectString(block.type, 'paragraph');

  if (type === 'list') {
    return { type: 'list', items: expectStringArray(block.items) };
  }

  if (type === 'code') {
    return { type: 'code', code: expectString(block.code, '') };
  }

  if (type === 'quote') {
    return { type: 'quote', content: expectString(block.content, '') };
  }

  return { type: 'paragraph', content: expectString(block.content, '') };
}

function parseSection(section: unknown): DocsSection | null {
  if (!isRecord(section)) return null;

  return {
    id: expectString(section.id, ''),
    title: expectString(section.title, ''),
    blocks: Array.isArray(section.blocks)
      ? (section.blocks.map(parseBlock).filter(Boolean) as DocsBlock[])
      : [],
  };
}

function parsePage(page: unknown): DocsPageDefinition | null {
  if (!isRecord(page)) return null;

  const slug = expectString(page.slug, '');

  return {
    category: expectString(page.category, ''),
    slug,
    groupLabel: expectString(page.groupLabel, ''),
    navLabel: expectString(page.navLabel, ''),
    title: expectString(page.title, ''),
    description: expectString(page.description, ''),
    eyebrow: expectString(page.eyebrow, ''),
    icon: getPageIcon(slug),
    sections: Array.isArray(page.sections)
      ? (page.sections.map(parseSection).filter(Boolean) as DocsSection[])
      : [],
  };
}

function parseDocsMessages(messages: Record<string, unknown>): DocsMessages {
  const docs = isRecord(messages.docs) ? messages.docs : {};

  return {
    sidebarEyebrow: expectString(docs.sidebarEyebrow, 'Docs'),
    sidebarTitle: expectString(docs.sidebarTitle, 'Project Docs'),
    sidebarDescription: expectString(docs.sidebarDescription, ''),
    heroEyebrow: expectString(docs.heroEyebrow, 'Junkyard Arcade Docs'),
    heroTitle: expectString(docs.heroTitle, 'Project Documentation'),
    heroDescription: expectString(docs.heroDescription, ''),
    footerLabel: expectString(docs.footerLabel, 'Project Docs'),
    footerCurrent: expectString(docs.footerCurrent, 'Single-page index'),
    pages: Array.isArray(docs.pages)
      ? (docs.pages.map(parsePage).filter(Boolean) as DocsPageDefinition[])
      : [],
  };
}

export function getDocsContent(messages: Record<string, unknown>): DocsContent {
  const docs = parseDocsMessages(messages);

  return {
    sidebarEyebrow: docs.sidebarEyebrow,
    sidebarTitle: docs.sidebarTitle,
    sidebarDescription: docs.sidebarDescription,
    heroEyebrow: docs.heroEyebrow,
    heroTitle: docs.heroTitle,
    heroDescription: docs.heroDescription,
    footerLabel: docs.footerLabel,
    footerCurrent: docs.footerCurrent,
    pages: docs.pages,
  };
}
