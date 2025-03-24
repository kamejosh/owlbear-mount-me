import OBR from "@owlbear-rodeo/sdk";
import { PropsWithChildren, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CustomThemeProvider } from "./CustomThemeProvider.tsx";
import { useMetadataContext } from "./context/MetadataContext.tsx";
import { metadataKey } from "./helpers/variables.ts";
import { RoomMetadata } from "./helpers/types.ts";
import { isEqual } from "lodash";
import { PluginGate } from "./context/PluginGateContext.tsx";
import { PlayerContext, PlayerContextType } from "./context/PlayerContext.ts";
import { useItemContext } from "./context/ItemContext.tsx";

export const ContextWrapper = (props: PropsWithChildren) => {
    const [role, setRole] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string | null>(null);
    const [ready, setReady] = useState<boolean>(false);
    const [sceneReady, setSceneReady] = useState<boolean>(false);
    const [room, setRoomMetadata] = useMetadataContext(useShallow((state) => [state.room, state.setRoomMetadata]));
    const [items, setItems] = useItemContext(useShallow((state) => [state.items, state.setItems]));

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.onReady(async () => {
                setReady(true);
            });
        }
    }, []);

    useEffect(() => {
        const initContext = async () => {
            setRole(await OBR.player.getRole());
            setPlayerId(OBR.player.id);
            setPlayerName(await OBR.player.getName());

            OBR.player.onChange(async (player) => {
                setRole(player.role);
                setPlayerId(player.id);
                setPlayerName(player.name);
            });

            // this throws an error when creating a new room so we catch it
            try {
                const roomMetadata = await OBR.room.getMetadata();
                if (metadataKey in roomMetadata) {
                    setRoomMetadata(roomMetadata[metadataKey] as RoomMetadata);
                }
            } catch {}

            OBR.room.onMetadataChange((metadata) => {
                if (metadataKey in metadata) {
                    const newRoomMetadata = metadata[metadataKey] as RoomMetadata;
                    if (!room || !isEqual(newRoomMetadata, room)) {
                        setRoomMetadata(newRoomMetadata);
                    }
                }
            });

            if (await OBR.scene.isReady()) {
                setSceneReady(true);
            } else {
                OBR.scene.onReadyChange(async (sceneReady) => {
                    setSceneReady(sceneReady);
                });
            }
        };
        if (ready) {
            initContext();
        }
    }, [ready]);

    useEffect(() => {
        const subscribeToItems = async () => {
            const obrItems = await OBR.scene.items.getItems((item) => item.attachedTo === undefined);
            setItems(obrItems);
            OBR.scene.items.onChange((updateItems) => {
                const filteredItems = updateItems.filter((item) => item.attachedTo === undefined);
                if (items.length !== filteredItems.length) {
                    setItems(filteredItems);
                }
            });
        };

        if (sceneReady) {
            void subscribeToItems();
        }
    }, [sceneReady]);

    const playerContext: PlayerContextType = { role: role, id: playerId, name: playerName };

    return (
        <PluginGate>
            <CustomThemeProvider>
                <PlayerContext.Provider value={playerContext}>{props.children}</PlayerContext.Provider>
            </CustomThemeProvider>
        </PluginGate>
    );
};
