import OBR, { BoundingBox, Item, Layer, Vector2 } from "@owlbear-rodeo/sdk";
import { isEqual, isUndefined } from "lodash";
import getItemBounds, { isSupported } from "./helpers.ts";

const layerMap: Record<Layer, Array<Layer>> = {
    CHARACTER: ["MOUNT", "DRAWING"],
    ATTACHMENT: ["MOUNT", "CHARACTER", "DRAWING"],
    MAP: [],
    GRID: [],
    DRAWING: [],
    PROP: [],
    MOUNT: [],
    NOTE: [],
    TEXT: [],
    RULER: [],
    FOG: [],
    POINTER: [],
    POST_PROCESS: [],
    CONTROL: [],
    POPOVER: [],
};

let tokenCache: Map<string, Item> = new Map();

const collides = ({ x, y }: Vector2, { min, max }: BoundingBox) => {
    return min.x <= x && x <= max.x && min.y <= y && y <= max.y;
};

OBR.onReady(async () => {
    const attachToken = async (items: Array<Item>) => {
        const movedTokens: Array<Item> = [];
        const removedTokens: Array<Item> = [];
        const userId = OBR.player.id;

        // auto attach logic
        items.forEach((item) => {
            const cached = tokenCache.get(item.id);
            if (
                item.lastModifiedUserId === userId &&
                isUndefined(item.attachedTo) &&
                ["CHARACTER", "ATTACHMENT"].includes(item.layer)
            ) {
                if (cached && !isEqual(cached.position, item.position)) {
                    movedTokens.push(item);
                } else if (!cached) {
                    movedTokens.push(item);
                }
            } else if (
                item.lastModifiedUserId === userId &&
                item.metadata["com.bitperfect-software.mount-me/auto-attached"]
            ) {
                removedTokens.push(item);
            }
        });

        for (const token of movedTokens) {
            const targets = items.filter((item) => {
                return item.visible && isSupported(item) && layerMap[token.layer].includes(item.layer);
            });
            for (const target of targets) {
                // @ts-ignore we filtered for supported items above
                const boundingBox = await getItemBounds(target);
                if (collides(token.position, boundingBox)) {
                    await OBR.scene.items.updateItems([token], (items) => {
                        for (const item of items) {
                            item.attachedTo = target.id;
                            item.metadata["com.bitperfect-software.mount-me/auto-attached"] = true;
                        }
                    });
                    break;
                }
            }
        }

        // auto remove logic
        for (const token of removedTokens) {
            const mount = items.find((item) => item.id === token.attachedTo);
            // @ts-ignore
            const boundingBox = await getItemBounds(mount);
            if (!collides(token.position, boundingBox)) {
                await OBR.scene.items.updateItems([token], (items) => {
                    for (const item of items) {
                        item.attachedTo = undefined;
                        item.metadata["com.bitperfect-software.mount-me/auto-attached"] = undefined;
                    }
                });
            }
        }

        tokenCache = new Map(items.map((item) => [item.id, item]));
    };

    OBR.scene.onReadyChange(async (ready) => {
        if (ready) {
            OBR.scene.items.onChange(attachToken);
        }
    });
});
