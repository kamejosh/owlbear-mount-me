import { RoomMetadata } from "./types.ts";
import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { metadataKey } from "./variables.ts";
import { isEqual } from "lodash";

export const updateRoomMetadata = async (
    room: RoomMetadata | null,
    data: Partial<RoomMetadata>,
    additionalData?: Metadata,
    force: boolean = false,
) => {
    const ownMetadata: Metadata = additionalData ?? {};
    ownMetadata[metadataKey] = { ...room, ...data };

    if (!room || !isEqual({ ...room, ...data }, room) || force) {
        await OBR.room.setMetadata({ ...ownMetadata });
    }
};
