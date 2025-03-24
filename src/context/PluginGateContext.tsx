import { ReactNode, useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";

export const PluginGate = ({ children }: { children: ReactNode }) => {
    const [ready, setReady] = useState(false);
    const [sceneReady, setSceneReady] = useState<boolean>(false);

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.onReady(() => setReady(true));
        }
    }, []);

    useEffect(() => {
        if (ready) {
            const initIsReady = async () => {
                setSceneReady(await OBR.scene.isReady());
            };
            OBR.scene.onReadyChange(async (ready) => {
                setSceneReady(ready);
            });
            initIsReady();
        }
    }, [ready]);

    if (ready && sceneReady) {
        return <>{children}</>;
    } else {
        return <>Waiting for owlbear rodeo</>;
    }
};
