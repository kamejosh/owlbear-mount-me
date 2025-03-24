import { create } from "zustand";
import { Item } from "@owlbear-rodeo/sdk";

export type ItemsContextType = {
    items: Array<Item>;
    setItems: (data: Array<Item>) => void;
};

export const useItemContext = create<ItemsContextType>()((set) => ({
    items: [],
    setItems: (items) =>
        set(() => {
            return { items: items };
        }),
}));
