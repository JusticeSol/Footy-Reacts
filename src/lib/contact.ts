/**
 * Contact details shown in the masthead dropdown.
 *
 * This is the only place to edit them. An empty list renders no button at all,
 * so nothing half-filled ever reaches the live site.
 *
 * `href` is what the link opens: mailto: for email, https:// for a profile.
 */
export interface ContactLink {
  /** Shown in mono caps above the value, e.g. "EMAIL", "X", "WHATSAPP". */
  label: string;
  /** Shown to the reader, e.g. "@handle" or the address itself. */
  value: string;
  href: string;
}

export const CONTACTS: ContactLink[] = [
  { label: "X", value: "@affanyjoe", href: "https://x.com/affanyjoe" },
  {
    label: "Email",
    value: "justiceundie@gmail.com",
    href: "mailto:justiceundie@gmail.com?subject=Footy%20Reacts",
  },
];
