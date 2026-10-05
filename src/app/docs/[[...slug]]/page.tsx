import fs from "fs";
import path from "path";
import Link from "next/link";
import { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";
import { sanitizeHtml, escapeHtml } from "@/lib/security/html-sanitizer";

const DOCS_DIR = path.join(process.cwd(), "content/docs");

function parseFrontmatter(file: string): {
  title: string;
  order: number;
  content: string;
} {
  const parts = file.split("---\n");
  if (parts.length < 3) return { title: "", order: 999, content: file };
  const meta: Record<string, string> = {};
  parts[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key) meta[key.trim()] = rest.join(":").trim();
  });
  return {
    title: meta.title || "",
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
    return { title: "Doc Not Found — Moistello" };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { title } = parseFrontmatter(raw);

  return {
    title: title ? `${title} — Moistello` : `Documentation — Moistello`,
    description:
      "Moistello documentation. Learn about Stellar savings circles, USDC contributions, MoiScore reputation, and smart contracts.",
    keywords:
      "moistello, documentation, stellar, savings circles, USDC, MoiScore, smart contracts, soroban, ROSCA",
    authors: [{ name: "Nekwachukwu Ucheokoye" }],
    creator: "Moistello",
    publisher: "Moistello",
    alternates: { canonical: `/docs/${slug === "index" ? "" : slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      locale: "en_US",
      url: `https://moistello.com/docs/${slug === "index" ? "" : slug}`,
      siteName: "Moistello",
      title: title || "Documentation",
      description: "Moistello documentation for Stellar savings circles.",
      images: [
        {
          url: "/logo.jpg",
          width: 1200,
          height: 630,
          alt: "Moistello Documentation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title || "Documentation",
      description: "Moistello docs for Stellar savings circles.",
      images: ["/logo.jpg"],
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
  // Tables
  html = html.replace(
    /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g,
    (_, header, body) => {
      const hCells = header
        .split("|")
        .filter((c: string) => c.trim())
        .map(
          (c: string) =>
            `<th class="border border-white/10 px-4 py-2 text-left font-heading text-sm">${c.trim()}</th>`,
        )
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map(
              (c: string) =>
                `<td class="border border-white/10 px-4 py-2 text-sm">${c.trim()}</td>`,
            )
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<div class="overflow-x-auto my-6"><table class="w-full border border-white/10 rounded-xl overflow-hidden glass"><thead><tr>${hCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
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
              <div className="glass rounded-2xl p-4 lg:sticky lg:top-28 dark:bg-background/80">
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
              <div className="glass-premium rounded-2xl p-6 md:p-10 dark:bg-background/60">
                <article dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
