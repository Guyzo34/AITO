import { cn } from "@/lib/utils";
export function Card(props) {
    return (<div {...props} className={cn("rounded-[2rem] border bg-card text-card-foreground", props.className)}/>);
}
export function CardHeader(props) {
    return <div {...props} className={cn("flex flex-col p-6", props.className)}/>;
}
export function CardTitle(props) {
    return <h3 {...props} className={cn("text-xl font-semibold", props.className)}/>;
}
export function CardDescription(props) {
    return <p {...props} className={cn("text-sm text-muted-foreground", props.className)}/>;
}
export function CardContent(props) {
    return <div {...props} className={cn("px-6 pb-6", props.className)}/>;
}
