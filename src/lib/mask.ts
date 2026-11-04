/** Masks a candidate's contact details for the client portal, so clients
 * review and shortlist through TalentLens instead of reaching out directly. */
export function maskEmail(email: string | null): string {
  if (!email) return "Not available";
  const [user, domain] = email.split("@");
  if (!domain) return "Hidden";
  const visible = user.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(user.length - 1, 3))}@${domain}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "Not available";
  const digits = phone.replace(/\D/g, "");
  return `${"*".repeat(Math.max(digits.length - 3, 3))}${digits.slice(-3)}`;
}
