import DashboardLayoutComponent from "@/components/layouts/DashboardLayout";
import { CartProvider } from "@/lib/cart-context";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CartProvider>
            <DashboardLayoutComponent>
                {children}
            </DashboardLayoutComponent>
        </CartProvider>
    );
}
