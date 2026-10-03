import fs from "fs";
import path from "path";
import Link from "next/link";
import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";
import { sanitizeHtml, escapeHtml } from "@/lib/security/html-sanitizer";
import { renderMarkdownTable } from "@/lib/markdown-table";

const PAGES_DIR = path.join(process.cwd(), "content/pages");
const DOCS_DIR = path.join(process.cwd(), "content/docs");

// ── Tiny Markdown Parser (zero dependencies) ──
function mdToHtml(md: string): string {
  // Escape HTML entities first to prevent raw HTML passthrough
  let html = escapeHtml(md);
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="glass-strong rounded-xl p-4 overflow-x-auto my-4 text-sm font-mono"><code>$2</code></pre>',
  );
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="glass-whisper rounded-md px-1.5 py-0.5 text-sm font-mono text-aurora-cyan">$1</code>',
  );
  // Tables — stacked cards below `sm`, named focusable scroll region above.
  let tableIndex = 0;
  html = html.replace(
    /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g,
    (_match, header: string, body: string) =>
      renderMarkdownTable(header, body, { index: tableIndex++ }),
  );
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold">$1</strong>',
  );
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl my-4 max-w-full" loading="lazy" decoding="async" />',
  );
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-aurora-cyan hover:underline transition-colors">$1</a>',
  );
  html = html.replace(
    /^#### (.+)$/gm,
    '<h4 class="font-heading text-base font-semibold mt-8 mb-3 gradient-text">$1</h4>',
  );
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="font-heading text-lg font-semibold mt-10 mb-4 gradient-text">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="font-heading text-2xl font-bold mt-12 mb-5 gradient-text-extended">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="font-heading text-4xl font-black mt-8 mb-8 holo-text">$1</h1>',
  );
  html = html.replace(/^---$/gm, '<hr class="border-white/10 my-8" />');
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-2 border-aurora-violet pl-4 my-4 text-muted-foreground italic">$1</blockquote>',
  );
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match: string) => {
    const items = match
      .trim()
      .split("\n")
      .map(
        (l) =>
          `<li class="ml-4 list-decimal text-muted-foreground leading-relaxed pl-1">${l.replace(/^\d+\. /, "")}</li>`,
      )
      .join("");
    return `<ol class="space-y-1 my-4">${items}</ol>`;
  });
  html = html.replace(/((?:^- .+\n?)+)/gm, (match: string) => {
    const items = match
      .trim()
      .split("\n")
      .map(
        (l) =>
          `<li class="ml-4 list-disc text-muted-foreground leading-relaxed pl-1">${l.replace(/^- /, "")}</li>`,
      )
      .join("");
    return `<ul class="space-y-1 my-4">${items}</ul>`;
  });
  const paras = html.split(/\n\n+/).map((p: string) => {
    p = p.trim();
    if (!p) return "";
    if (
      p.startsWith("<h") ||
      p.startsWith("<pre") ||
      p.startsWith("<table") ||
      p.startsWith("<ul") ||
      p.startsWith("<ol") ||
      p.startsWith("<div") ||
      p.startsWith("<blockquote") ||
      p.startsWith("<hr")
    )
      return p;
    return `<p class="text-muted-foreground leading-relaxed mb-4">${p}</p>`;
  });
  return paras.join("\n");
}

function parseFrontmatter(file: string): {
  title: string;
  description: string;
  content: string;
} {
  const parts = file.split("---\n");
  if (parts.length < 3) return { title: "", description: "", content: file };
  const meta: Record<string, string> = {};
  parts[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key) meta[key.trim()] = rest.join(":").trim();
  });
  return {
    title: meta.title || "",
    description: meta.description || "",
    content: parts.slice(2).join("---\n").trim(),
  };
}

// ── Metadata for SEO ──
export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const slug =
    params.slug && params.slug.length > 0 ? params.slug.join("/") : "index";
  const filePath = path.join(PAGES_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return { title: "Page Not Found — Moistello" };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { title, description } = parseFrontmatter(raw);

  return {
    title: title || slug,
    description: description || `Page: ${slug}`,
  };
}

// ── Page list for sidebar ──
function getPagesList(): { slug: string; title: string }[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(PAGES_DIR, f), "utf-8");
      const { title } = parseFrontmatter(raw);
      return {
        slug: f.replace(/\.md$/, ""),
        title: title || f.replace(/\.md$/, ""),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function getDocsList(): { slug: string; title: string }[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(DOCS_DIR, f), "utf-8");
      const { title } = parseFrontmatter(raw);
      return {
        slug: f.replace(/\.md$/, ""),
        title: title || f.replace(/\.md$/, ""),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── Page Component ──
export default function UploadedPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slug =
    params.slug && params.slug.length > 0 ? params.slug.join("/") : "";
  if (!slug) {
    // /p — index showing all uploaded pages
    const pages = getPagesList();
    const docs = getDocsList();
    return (
      <PublicLayout>
        <div className="auroral-mesh min-h-screen">
          <div className="container-premium py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="lg:w-56 shrink-0">
                <div className="glass rounded-2xl p-4 lg:sticky lg:top-28">
                  <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-4">
                    Pages
                  </h3>
                  <nav className="space-y-0.5">
                    {pages.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-2">
                        No pages uploaded yet.
                      </p>
                    ) : (
                      pages.map((p) => (
                        <Link
                          key={p.slug}
                          href={`/p/${p.slug}`}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper transition-all"
                        >
                          {p.title}
                        </Link>
                      ))
                    )}
                  </nav>
                  {docs.length > 0 && (
                    <>
                      <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mt-6 mb-4">
                        Docs
                      </h3>
                      <nav className="space-y-0.5">
                        {docs.map((d) => (
                          <Link
                            key={d.slug}
                            href={`/docs/${d.slug === "index" ? "" : d.slug}`}
                            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper transition-all"
                          >
                            {d.title}
                          </Link>
                        ))}
                      </nav>
                    </>
                  )}
                </div>
              </aside>
              <main className="flex-1 min-w-0">
                <div className="glass-premium rounded-2xl p-6 md:p-10">
                  {pages.length === 0 ? (
                    <div className="text-center py-16">
                      <h1 className="font-heading text-3xl gradient-text mb-4">
                        Uploaded Pages
                      </h1>
                      <p className="text-muted-foreground mb-6">
                        No pages have been uploaded yet. Upload a .md or .html
                        file at{" "}
                        <Link
                          href="/upload"
                          className="text-aurora-cyan hover:underline"
                        >
                          /upload
                        </Link>
                        .
                      </p>
                      <Link
                        href="/upload"
                        className="gradient-bg-extended text-white px-6 py-2 rounded-xl font-heading text-sm"
                      >
                        Go to Upload
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <h1 className="font-heading text-3xl gradient-text mb-4">
                        Uploaded Pages
                      </h1>
                      {pages.map((p) => (
                        <Link
                          key={p.slug}
                          href={`/p/${p.slug}`}
                          className="glass rounded-xl p-4 flex items-center justify-between hover:glass-strong transition-all"
                        >
                          <span className="font-medium">{p.title}</span>
                          <span className="text-muted-foreground text-sm font-mono">
                            /p/{p.slug}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // /p/<slug> — render specific page
  const filePath = path.join(PAGES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return (
      <PublicLayout>
        <div className="auroral-mesh min-h-screen">
          <div className="container-premium py-24 text-center">
            <h1 className="font-heading text-4xl gradient-text mb-4">
              Page Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              No page exists at /p/{slug}.
            </p>
            <Link
              href="/p"
              className="gradient-bg-extended text-white px-6 py-2 rounded-xl font-heading"
            >
              All Pages
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { content } = parseFrontmatter(raw);
  const html = sanitizeHtml(mdToHtml(content));

  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <div className="container-premium py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-56 shrink-0">
              <div className="glass rounded-2xl p-4 lg:sticky lg:top-28">
                <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-4">
                  Pages
                </h3>
                <nav className="space-y-0.5">
                  {getPagesList().map((p) => (
                    <Link
                      key={p.slug}
                      href={`/p/${p.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                        slug === p.slug
                          ? "glass-strong text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:glass-whisper"
                      }`}
                    >
                      {p.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>
            <main className="flex-1 min-w-0">
              <div className="glass-premium rounded-2xl p-6 md:p-10">
                <article dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
