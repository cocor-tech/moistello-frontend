import fs from "fs";
import path from "path";
import Link from "next/link";
import { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";
import { sanitizeHtml, escapeHtml } from "@/lib/security/html-sanitizer";
import { buildRouteMetadata } from "@/lib/seo/route-metadata";
import { absoluteUrl } from "@/lib/seo/site";
import { renderMarkdownTable } from "@/lib/markdown-table";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

function parseFrontmatter(file: string): {
  title: string;
  description: string;
  order: number;
  content: string;
} {
  const parts = file.split("---\n");
  if (parts.length < 3) return { title: "", description: "", order: 999, content: file };
  const meta: Record<string, string> = {};
  parts[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key) meta[key.trim()] = rest.join(":").trim();
  });
  return {
    title: meta.title || "",
    description: meta.description || "",
    order: parseInt(meta.order || "999"),
    content: parts.slice(2).join("---\n").trim(),
  };
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const slug =
    params.slug && params.slug.length > 0 ? params.slug.join("/") : "index";
  const filePath = path.join(DOCS_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return {
      title: "Doc Not Found — Moistello",
      description: "That documentation page does not exist.",
      robots: { index: false, follow: false },
    };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { title, description } = parseFrontmatter(raw);
  const pageTitle = title || "Documentation";
  const canonical = `/docs/${slug === "index" ? "" : slug}`;

  // Built on the docs base entry so every doc inherits the full OG/Twitter
  // block, then overridden with per-page copy. The base guarantees a scraper
  // always finds a description even when a markdown file omits frontmatter.
  const base = buildRouteMetadata("/docs");

  return {
    ...base,
    title: `${pageTitle} — Moistello`,
    description:
      description ||
      `Moistello docs: ${pageTitle.toLowerCase()} — passkey authentication, auto-provisioned Stellar wallets, USDC savings circles and Soroban contracts.`,
    alternates: { canonical },
    openGraph: {
      ...base.openGraph,
      type: "article",
      url: absoluteUrl(canonical),
      title: `${pageTitle} — Moistello`,
      description: description || `${pageTitle} in the Moistello developer and user documentation.`,
    },
    twitter: {
      ...base.twitter,
      title: `${pageTitle} — Moistello`,
      description: description || `${pageTitle} in the Moistello documentation.`,
    },
  };
}

function mdToHtml(md: string): string {
  // Escape HTML entities first to prevent raw HTML passthrough
  let html = escapeHtml(md);
  // Code blocks (fenced)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="glass-strong rounded-xl p-4 overflow-x-auto my-4 text-sm font-mono"><code>$2</code></pre>',
  );
  // Inline code
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
  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold">$1</strong>',
  );
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl my-4 max-w-full" loading="lazy" decoding="async" />',
  );
  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-aurora-cyan hover:underline transition-colors">$1</a>',
  );
  // Headings
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
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-white/10 my-8" />');
  // Blockquotes
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-2 border-aurora-violet pl-4 my-4 text-muted-foreground italic">$1</blockquote>',
  );
  // Ordered lists
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
  // Unordered lists
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
  // Paragraphs (double newlines → paragraphs)
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

function getDocsList(): { slug: string; title: string; order: number }[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const docs = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(DOCS_DIR, f), "utf-8");
      const { title, order } = parseFrontmatter(raw);
      return {
        slug: f.replace(/\.md$/, ""),
        title: title || f.replace(/\.md$/, ""),
        order,
      };
    })
    .sort((a, b) => a.order - b.order);
  docs.push({ slug: "api", title: "API Reference", order: 100 });
  return docs;
}

// ── Page Component ──
export default function DocsPage({ params }: { params: { slug?: string[] } }) {
  const { slug } = params;
  const targetSlug = slug && slug.length > 0 ? slug.join("/") : "index";
  const filePath = path.join(DOCS_DIR, `${targetSlug}.md`);

  const docs = getDocsList();

  // 404
  if (!fs.existsSync(filePath)) {
    return (
      <PublicLayout>
        <div className="auroral-mesh min-h-screen">
          <div className="container-premium py-24 text-center">
            <h1 className="font-heading text-4xl gradient-text mb-4">
              Page Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              This doc doesn&apos;t exist yet. Create{" "}
              <code className="text-sm glass-whisper px-2 py-0.5 rounded font-mono">
                content/docs/{targetSlug}.md
              </code>{" "}
              to add it.
            </p>
            <Link
              href="/docs"
              className="gradient-bg-extended text-white px-6 py-2 rounded-xl font-heading"
            >
              Back to Docs
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
            {/* Sidebar */}
            <aside className="lg:w-56 shrink-0">
              <div className="glass rounded-2xl p-4 lg:sticky lg:top-28">
                <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-4">
                  Docs
                </h3>
                <nav className="space-y-0.5">
                  {docs.map((doc) => (
                    <Link
                      key={doc.slug}
                      href={`/docs/${doc.slug === "index" ? "" : doc.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                        targetSlug === doc.slug
                          ? "glass-strong text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:glass-whisper"
                      }`}
                    >
                      {doc.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
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
