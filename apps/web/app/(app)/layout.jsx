import { AppShell } from "@/components/app-shell";
export default function ProtectedLayout(props) {
    return <AppShell>{props.children}</AppShell>;
}
