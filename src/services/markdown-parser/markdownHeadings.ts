export interface MarkdownHeading {
    line: number;
    level: number;
    text: string;
    slug: string;
}

export interface ReferencedHeadingMark {
    line: number;
    hashLength: number;
}

/**
 * Parses ATX headings and assigns stable slugs for heading links.
 */
export function parseMarkdownHeadings(content: string): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];
    const slugCounts = new Map<string, number>();
    const lines = content.split(/\r\n|\r|\n/);
    let inFence = false;

    lines.forEach((line, lineIndex) => {
        if (/^\s*(```+|~~~+)/.test(line)) {
            inFence = !inFence;
            return;
        }

        if (inFence) {
            return;
        }

        const match = /^(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line);
        if (!match) {
            return;
        }

        const text = stripClosingHashes(match[2]);
        const baseSlug = slugFromHeading(text);
        const count = slugCounts.get(baseSlug) ?? 0;
        slugCounts.set(baseSlug, count + 1);

        headings.push({
            line: lineIndex,
            level: match[1].length,
            text,
            slug: count === 0 ? baseSlug : `${baseSlug}-${count}`,
        });
    });

    return headings;
}

/**
 * Normalizes a link fragment so it can be compared with parsed heading slugs.
 */
export function normalizeHeadingFragment(fragment: string): string {
    const withoutHash = fragment.replace(/^#/, "");
    return slugFromHeading(safeDecodeURIComponent(withoutHash));
}

/**
 * Finds the heading hash ranges that should receive a reference marker.
 */
export function getReferencedHeadingMarks(
    content: string,
    referencedSlugs: readonly string[],
): ReferencedHeadingMark[] {
    const referenced = new Set(referencedSlugs);

    return parseMarkdownHeadings(content)
        .filter((heading) => referenced.has(heading.slug))
        .map((heading) => ({
            line: heading.line,
            hashLength: heading.level,
        }));
}

function stripClosingHashes(text: string): string {
    return text.replace(/[ \t]+#+[ \t]*$/, "").trim();
}

function slugFromHeading(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/\s+/g, "-");
}

function safeDecodeURIComponent(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
