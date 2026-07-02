import { strict as assert } from "assert";
import { test } from "node:test";
import { referencedHeadingDecorationOptions } from "../features/heading-references/headingDecorationStyle";

test("uses muted neutral colors for referenced heading highlights", () => {
    assert.equal(
        referencedHeadingDecorationOptions.backgroundColor,
        "rgba(128, 128, 128, 0.18)",
    );
    assert.equal(
        referencedHeadingDecorationOptions.border,
        "1px solid rgba(128, 128, 128, 0.28)",
    );
    assert.equal("color" in referencedHeadingDecorationOptions, false);
});
