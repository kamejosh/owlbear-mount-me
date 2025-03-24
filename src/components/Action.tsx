import { Layer } from "@owlbear-rodeo/sdk";
import { Autocomplete, Button, InputLabel, MenuItem, Select, Slider, TextField } from "@mui/material";
import { AutoMountLayer } from "../helpers/types.ts";
import { useMetadataContext } from "../context/MetadataContext.tsx";
import { useShallow } from "zustand/react/shallow";
import { updateRoomMetadata } from "../helpers/metadataHelpers.ts";
import style from "./action.module.css";
import { useItemContext } from "../context/ItemContext.tsx";
import { isArray } from "lodash";

const layerOptions: Array<Layer> = ["DRAWING", "PROP", "MOUNT", "CHARACTER", "ATTACHMENT", "NOTE", "TEXT"];

const LayerSelect = ({
    layer,
    updateLayers,
    removeLayer,
    layerIndex,
}: {
    layer: AutoMountLayer;
    updateLayers: (layers: AutoMountLayer, index: number) => void;
    removeLayer: (index: number) => void;
    layerIndex: number;
}) => {
    return (
        <div className={style.entry}>
            <Select
                value={layer.rider}
                onChange={(e) => {
                    updateLayers({ ...layer, rider: e.target.value as Layer }, layerIndex);
                }}
            >
                {layerOptions.map((option, i) => (
                    <MenuItem key={i} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </Select>
            <Autocomplete
                multiple
                options={layerOptions.filter((option) => option !== layer.rider)}
                getOptionLabel={(option) => option}
                value={layer.mount}
                onChange={(_, value) => {
                    updateLayers({ ...layer, mount: value }, layerIndex);
                }}
                renderInput={(params) => <TextField {...params} />}
            />
            <Button
                onClick={() => {
                    removeLayer(layerIndex);
                }}
            >
                remove
            </Button>
        </div>
    );
};

export const Action = () => {
    const [room, setRoomMetadata] = useMetadataContext(useShallow((state) => [state.room, state.setRoomMetadata]));
    const items = useItemContext(useShallow((state) => state.items));
    const updateLayers = async (layer: AutoMountLayer, index: number) => {
        if (room && room.mountLayers) {
            const newLayers = Array.from(room.mountLayers);
            newLayers[index] = layer;
            await updateRoomMetadata(room, { mountLayers: newLayers });
        }
    };

    const removeLayer = async (index: number) => {
        if (room && room.mountLayers) {
            const newLayers = Array.from(room.mountLayers);
            newLayers.splice(index, 1);
            await updateRoomMetadata(room, { mountLayers: newLayers });
        }
    };

    return (
        <div className={style.action}>
            {room?.mountLayers?.map((layer, i) => (
                <LayerSelect
                    key={i}
                    layer={layer}
                    updateLayers={updateLayers}
                    removeLayer={removeLayer}
                    layerIndex={i}
                />
            ))}
            <Button
                disabled={(room && room.mountLayers && room.mountLayers.length >= 3) || false}
                onClick={() => {
                    const newLayers = Array.from(room?.mountLayers || []);
                    newLayers.push({ rider: "CHARACTER", mount: [] });
                    setRoomMetadata({ mountLayers: newLayers });
                }}
            >
                Add Layer
            </Button>
            <InputLabel aria-label={"Exceptions"}>
                <h4>Exceptions</h4>
                <Autocomplete
                    multiple
                    options={items}
                    value={items.filter((i) => room?.exceptions?.includes(i.id))}
                    getOptionLabel={(option) => `${option.name} - ${option.id}`}
                    onChange={async (_, value) => {
                        await updateRoomMetadata(room, { exceptions: value.map((v) => v.id) });
                    }}
                    renderInput={(params) => <TextField {...params} />}
                />
            </InputLabel>
            <InputLabel aria-label={"Droppable Area of Mount (0: everywhere - 100: center)"}>
                <h4>Droppable Area of Mount (0: everywhere - 100: center)</h4>
                <div className={style.slider}>
                    <Slider
                        style={{ width: "80%", margin: "auto" }}
                        defaultValue={0}
                        step={1}
                        valueLabelDisplay={"auto"}
                        value={room?.centerDistance || 0}
                        onChangeCommitted={async (_, value) => {
                            if (isArray(value)) {
                                return;
                            } else {
                                await updateRoomMetadata(room, { centerDistance: value });
                            }
                        }}
                    />
                </div>
            </InputLabel>
        </div>
    );
};
