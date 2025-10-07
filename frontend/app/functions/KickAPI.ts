export function extractChannelName(input: string): string {
  if (!input) return "";

  if (input.includes("kick.com/")) {
    const parts = input.split("kick.com/");
    const channel = parts[1].split(/[/?]/)[0];
    return channel.toLowerCase();
  }
  return input.toLowerCase();
}

export function extractKickChannelName(input: string): string {
  if (!input) return "";

  if (input.includes("kick.com/")) {
    const parts = input.split("kick.com/");
    const channel = parts[1].split(/[/?]/)[0];
    return channel.toLowerCase();
  }
  return input.toLowerCase();
}

export async function getViewerCount(username: string): Promise<number> {
  if (!username) {
    console.log("No username provided for Kick viewer count fetch");
    return 0;
  }

  const channelName = extractKickChannelName(username);

  try {
    // Kick utilise une API REST plutôt que GraphQL
    const response = await fetch(
      `https://kick.com/api/v1/channels/${channelName}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();
    // La structure de la réponse de l'API Kick est différente
    const viewersCount = data?.livestream?.viewer_count || 0;

    return viewersCount;
  } catch (error) {
    console.error(
      `🔴 Error fetching Kick viewer count for ${username}:`,
      error
    );
    return 0;
  }
}
