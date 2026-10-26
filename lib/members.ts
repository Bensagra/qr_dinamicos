import { z } from "zod";
import { adminClient } from "./admin";
import { authorize, HttpError, isAdminEmail } from "./http";

export type Member = { user_id: string; email: string; created_at: string; pending: boolean };

// Owner only. Venue users can sign in and manage that venue's menu photos.
async function ownerVenue(venueId: string) {
  const db = await authorize();
  if (!db) throw new HttpError("Los usuarios por local requieren Supabase. En modo local no hay cuentas.", 503);
  const notFound = new HttpError("El local no existe o no tenés acceso.", 404);
  if (!z.uuid().safeParse(venueId).success) throw notFound;
  const { data, error } = await db.from("venues").select("id").eq("id", venueId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound;
  return adminClient();
}
const welcomeUrl = (origin: string) => `${origin}/bienvenida`;
async function findUser(db: ReturnType<typeof adminClient>, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user ?? null;
  }
}

export async function listMembers(venueId: string): Promise<Member[]> {
  const db = await ownerVenue(venueId);
  const { data, error } = await db.from("venue_members").select("user_id,email,created_at").eq("venue_id", venueId).order("email");
  if (error) throw error;
  return Promise.all(
    data.map(async (member) => {
      const { data: found } = await db.auth.admin.getUserById(member.user_id);
      return { ...member, pending: !found.user?.last_sign_in_at };
    }),
  );
}
export async function addMember(venueId: string, input: unknown, origin: string) {
  const db = await ownerVenue(venueId);
  const email = z.object({ email: z.email("Ingresá un email válido.") }).parse(input).email.trim().toLowerCase();
  if (isAdminEmail(email)) throw new HttpError("Esa es tu cuenta de administración: ya tiene acceso a todo.", 400);
  // New people get an invitation to choose a password; existing accounts just gain this venue.
  let user = await findUser(db, email);
  if (!user) {
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: welcomeUrl(origin) });
    if (error) throw error.status === 429 ? new HttpError("Se enviaron demasiados emails. Esperá unos minutos.", 429) : error;
    user = data.user;
  }
  const { error } = await db.from("venue_members").insert({ venue_id: venueId, user_id: user.id, email });
  if (error?.code === "23505") throw new HttpError("Esa persona ya tiene acceso a este local.", 409);
  if (error) throw error;
}
export async function resendAccess(venueId: string, userId: string, origin: string) {
  const db = await ownerVenue(venueId);
  const { data: member, error } = await db.from("venue_members").select("email").eq("venue_id", venueId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!member) throw new HttpError("Esta persona ya no tiene acceso al local.", 404);
  const { data } = await db.auth.admin.getUserById(userId);
  // Never signed in: repeat the invitation. Otherwise send a link to choose a new password.
  const { error: sendError } = data.user?.last_sign_in_at
    ? await db.auth.resetPasswordForEmail(member.email, { redirectTo: welcomeUrl(origin) })
    : await db.auth.admin.inviteUserByEmail(member.email, { redirectTo: welcomeUrl(origin) });
  if (sendError?.status === 429) throw new HttpError("Se enviaron demasiados emails. Esperá unos minutos.", 429);
  if (sendError) throw sendError;
}
export async function removeMember(venueId: string, userId: string) {
  const db = await ownerVenue(venueId);
  const { error } = await db.from("venue_members").delete().eq("venue_id", venueId).eq("user_id", userId);
  if (error) throw error;
  // Accounts left without any venue are deleted, so they can't sign in anymore.
  const { count, error: countError } = await db.from("venue_members").select("user_id", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) throw countError;
  if (!count) {
    const { data } = await db.auth.admin.getUserById(userId);
    if (data.user && !isAdminEmail(data.user.email)) {
      const { error: deleteError } = await db.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
    }
  }
}
