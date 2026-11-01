import BookingHeader from "@/components/booking/BookingHeader";
import BookingFooter from "@/components/booking/BookingFooter";

export default function PolicyLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <BookingHeader />
      <div className="flex-1">{children}</div>
      <BookingFooter />
    </div>
  );
}
