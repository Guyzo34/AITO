import { Instrument_Sans, Syne } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";
const instrumentSans = Instrument_Sans({
    subsets: ["latin"],
    variable: "--font-instrument-sans"
});
const syne = Syne({
    subsets: ["latin"],
    variable: "--font-syne"
});
export const metadata = {
    title: "Agents Marketing",
    description: "Interface client Agents Marketing"
};
export default function RootLayout(props) {
    return (<html lang="fr" className={`${instrumentSans.variable} ${syne.variable}`}>
      <body>
        <ToastProvider>
          <AuthProvider>{props.children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>);
}
