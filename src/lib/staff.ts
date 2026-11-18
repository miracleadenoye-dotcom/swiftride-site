/** Which staff roles may open which admin section. super_admin sees everything.
 *  This only hides menu items; the real enforcement is RLS and role-checked functions in the database. */
export const SECTIONS: Record<string, string[]> = {
  stats: ['support', 'finance', 'verification'],
  users: ['support'],
  verification: ['verification'],
  bookings: ['support', 'finance'],
  vehicles: ['support'],
  settings: ['support', 'finance'],
}
export const canSee = (staffRole: string | null, section: keyof typeof SECTIONS) =>
  staffRole === 'super_admin' || (!!staffRole && SECTIONS[section].includes(staffRole))
