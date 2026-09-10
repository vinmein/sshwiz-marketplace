import { renderSocialCard } from "@/lib/brandImages";

export const alt = "sshwiz — SSH in, click, it's installed. Set up a Linux server in a few clicks.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderSocialCard();
}
