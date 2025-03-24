import { create } from "zustand";
import { RoomMetadata } from "../helpers/types.ts";

export type MetadataContextType = {
    room: RoomMetadata | null;
    setRoomMetadata: (data: Partial<RoomMetadata>) => void;
};

export const useMetadataContext = create<MetadataContextType>()((set) => ({
    room: { mountLayers: [], exceptions: [], centerDistance: 0 },
    setRoomMetadata: (data) =>
        set((state) => {
            return { room: { ...state.room, ...data } };
        }),
}));
