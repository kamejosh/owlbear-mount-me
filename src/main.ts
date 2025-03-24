import OBR, { BoundingBox, Item, Vector2 } from "@owlbear-rodeo/sdk";
import { isEqual, isUndefined, uniq } from "lodash";
import getItemBounds, { isSupported } from "./helpers.ts";
import { metadataKey } from "./helpers/variables.ts";
import { AutoMountLayer, RoomMetadata } from "./helpers/types.ts";

const layerMap: Array<AutoMountLayer> = [
    {
        rider: "CHARACTER",
        mount: ["MOUNT", "DRAWING"],
    },
    { rider: "ATTACHMENT", mount: ["MOUNT", "CHARACTER", "DRAWING"] },
];

let tokenCache: Map<string, Item> = new Map();

const collides = ({ x, y }: Vector2, { min, max }: BoundingBox, centerDistance: number = 0) => {
    if (centerDistance > 0) {
        const xLength = max.x - min.x;
        const yLength = max.y - min.y;
        const xDist = xLength * ((100 - centerDistance) / 100);
        const yDist = yLength * ((100 - centerDistance) / 100);
        const xDelta = xLength - xDist;
        const yDelta = yLength - yDist;
        min.x += xDelta / 2;
        max.x -= xDelta / 2;
        min.y += yDelta / 2;
        max.y -= yDelta / 2;
    }
    return min.x <= x && x <= max.x && min.y <= y && y <= max.y;
};

OBR.onReady(async () => {
    const attachToken = async (items: Array<Item>) => {
        const movedTokens: Array<Item> = [];
        const removedTokens: Array<Item> = [];
        const userId = OBR.player.id;
        const roomMetadata = await OBR.room.getMetadata();
        let roomLayerMap: Array<AutoMountLayer> | undefined = layerMap;
        let exceptions: Array<string> | undefined = [];
        let centerDistance: number | undefined = 0;

        if (metadataKey in roomMetadata) {
            roomLayerMap = (roomMetadata[metadataKey] as RoomMetadata).mountLayers;
            exceptions = (roomMetadata[metadataKey] as RoomMetadata).exceptions;
            centerDistance = (roomMetadata[metadataKey] as RoomMetadata).centerDistance;
        }

        roomLayerMap = roomLayerMap ?? layerMap;
        exceptions = exceptions ?? [];
        centerDistance = centerDistance ?? 0;

        const riderLayers = uniq(roomLayerMap.map((l) => l.rider));

        // auto attach logic
        items.forEach((item) => {
            const cached = tokenCache.get(item.id);

            if (
                item.lastModifiedUserId === userId &&
                !exceptions?.includes(item.id) &&
                isUndefined(item.attachedTo) &&
                riderLayers.includes(item.layer)
            ) {
                if (cached && !isEqual(cached.position, item.position)) {
                    movedTokens.push(item);
                } else if (!cached) {
                    movedTokens.push(item);
                }
            } else if (item.lastModifiedUserId === userId && item.metadata[`${metadataKey}/auto-attached`]) {
                removedTokens.push(item);
            }
        });

        for (const token of movedTokens) {
            const mountLayers = uniq(roomLayerMap.filter((l) => l.rider === token.layer).flatMap((l) => l.mount));
            const targets = items.filter((item) => {
                return (
                    item.id !== token.id &&
                    item.visible &&
                    !exceptions?.includes(item.id) &&
                    isSupported(item) &&
                    mountLayers.includes(item.layer)
                );
            });
            for (const target of targets) {
                // @ts-ignore we filtered for supported items above
                const boundingBox = await getItemBounds(target);
                if (collides(token.position, boundingBox, centerDistance)) {
                    await OBR.scene.items.updateItems([token], (items) => {
                        for (const item of items) {
                            item.attachedTo = target.id;
                            item.metadata[`${metadataKey}/auto-attached`] = true;
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
            if (!collides(token.position, boundingBox, centerDistance)) {
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

    const sceneReady = await OBR.scene.isReady();
    if (sceneReady) {
        OBR.scene.items.onChange(attachToken);
    } else {
        OBR.scene.onReadyChange(async (ready) => {
            if (ready) {
                OBR.scene.items.onChange(attachToken);
            }
        });
    }
});
