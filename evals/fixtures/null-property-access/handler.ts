interface User {
  id: string;
  name: string;
  email: string;
  profile: {
    avatar: string;
    bio: string;
  };
}

interface ApiResponse {
  users: User[];
  total: number;
}

async function fetchUsers(endpoint: string): Promise<ApiResponse> {
  const response = await fetch(endpoint);
  return response.json() as Promise<ApiResponse>;
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const data = await fetchUsers(`/api/users?id=${userId}`);
  const user = data.users.find((u) => u.id === userId);

  // Bug: user could be undefined if not found in the array,
  // but we access .name without checking
  const displayName = user.name;
  const avatarUrl = user.profile.avatar;

  return `${displayName} (${avatarUrl})`;
}

export async function getTeamMembers(teamId: string): Promise<string[]> {
  const data = await fetchUsers(`/api/teams/${teamId}/members`);
  return data.users.map((u) => u.name);
}
