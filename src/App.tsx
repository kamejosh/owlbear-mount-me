import { ContextWrapper } from "./ContextWrapper.tsx";
import { Action } from "./components/Action.tsx";

export const App = () => {
    return (
        <ContextWrapper>
            <Action />
        </ContextWrapper>
    );
};
