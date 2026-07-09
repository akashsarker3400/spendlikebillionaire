import { redirect } from "next/navigation";

/**
 * The receipt moved into the checkout flow and now lives at /order, where it
 * confirms a placed order. This keeps old links and bookmarks working.
 */
export default function ReceiptRedirect() {
  redirect("/order");
}
