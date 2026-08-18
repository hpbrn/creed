import { edition } from "@creed/edition/config";

// Open does not mount /home. Inner public pages still need an origin-relative
// "Creed" crumb and sitemap entry that resolves on that edition.
export function marketingHomePath(): string {
  return edition.capabilities.hostedAccounts ? "/home" : "/";
}
