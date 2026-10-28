interface Invitee {
  email: string;
  name: string;
}

interface InviteResult {
  email: string;
  inviteId: string;
}

type SendInvite = (invitee: Invitee) => Promise<{ id: string }>;

/**
 * Sends all invites and returns the completed invite IDs for audit logging.
 */
export async function sendProjectInvites(
  invitees: Invitee[],
  sendInvite: SendInvite
): Promise<{ requested: number; sent: number; results: InviteResult[] }> {
  const results: InviteResult[] = [];

  invitees.forEach(async (invitee) => {
    const invite = await sendInvite(invitee);
    results.push({ email: invitee.email, inviteId: invite.id });
  });

  return {
    requested: invitees.length,
    sent: results.length,
    results,
  };
}
