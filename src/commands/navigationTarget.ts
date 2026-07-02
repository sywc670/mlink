export interface NavigationTarget {
    relPath: string;
    line: number;
}

export interface LinkCommandMetadata {
    relPath: string;
    sourceRelPath: string;
    line: number;
    type: "links" | "backlinks";
    isDir: boolean;
    slug?: string;
}

/**
 * Chooses the source location of the Markdown link itself.
 */
export function getSourceNavigationTarget(
    meta: LinkCommandMetadata,
): NavigationTarget {
    return {
        relPath: meta.sourceRelPath,
        line: meta.line,
    };
}

/**
 * Accepts command arguments from direct tree clicks and tree context menus.
 */
export function resolveLinkCommandMetadata(
    argument: unknown,
): LinkCommandMetadata | undefined {
    const candidate = isRecord(argument) && isRecord(argument.meta)
        ? argument.meta
        : argument;

    if (!isRecord(candidate)) {
        return undefined;
    }

    const { relPath, sourceRelPath, line, type, isDir, slug } = candidate;
    if (
        typeof relPath !== "string" ||
        typeof sourceRelPath !== "string" ||
        typeof line !== "number" ||
        (type !== "links" && type !== "backlinks") ||
        typeof isDir !== "boolean"
    ) {
        return undefined;
    }

    return {
        relPath,
        sourceRelPath,
        line,
        type,
        isDir,
        ...(typeof slug === "string" ? { slug } : {}),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
