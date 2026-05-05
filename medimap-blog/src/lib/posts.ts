import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  category?: string;
  tags?: string[];
  author?: string;
  cover?: string;
  faq?: { question: string; answer: string }[];
  medicalCondition?: string;
  medicalSpecialty?: string;
  reviewedBy?: string;
  /** Pin a post as the blog index hero card. First `featured: true` wins; falls back to newest. */
  featured?: boolean;
}

export interface Post extends PostMeta {
  source: string;
}

async function readPostFile(slug: string): Promise<Post | null> {
  const file = path.join(POSTS_DIR, `${slug}.mdx`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ""),
      date: String(data.date ?? new Date().toISOString().slice(0, 10)),
      updated: data.updated ? String(data.updated) : undefined,
      category: data.category ? String(data.category) : undefined,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
      author: data.author ? String(data.author) : undefined,
      cover: data.cover ? String(data.cover) : undefined,
      faq: Array.isArray(data.faq) ? data.faq : undefined,
      medicalCondition: data.medicalCondition ? String(data.medicalCondition) : undefined,
      medicalSpecialty: data.medicalSpecialty ? String(data.medicalSpecialty) : undefined,
      reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
      featured: data.featured === true,
      source: content,
    };
  } catch {
    return null;
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(POSTS_DIR);
    return files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const slugs = await getAllPostSlugs();
  const posts = await Promise.all(slugs.map((s) => readPostFile(s)));
  return posts
    .filter((p): p is Post => p !== null)
    .map(({ source: _source, ...meta }) => meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return readPostFile(slug);
}
