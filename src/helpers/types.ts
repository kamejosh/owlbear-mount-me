import { Layer } from "@owlbear-rodeo/sdk";

export type AutoMountLayer = { rider: Layer; mount: Array<Layer> };

export type RoomMetadata = {
    mountLayers?: Array<AutoMountLayer>;
    exceptions?: Array<string>;
    centerDistance?: number;
};
