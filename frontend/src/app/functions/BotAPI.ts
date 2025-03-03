const API_BASE_URL = "https://velbots.shop/api/bot";

export const startBot = async (config: {
  channelName: string;
  threads: number;
  proxyFile?: File;
  timeout?: number;
  proxyType?: string;
  stabilityMode?: boolean;
}) => {
  const formData = new FormData();
  formData.append("channelName", config.channelName);
  formData.append("threads", config.threads.toString());
  if (config.proxyFile) {
    formData.append("proxyFile", config.proxyFile);
  }
  if (config.timeout) {
    formData.append("timeout", config.timeout.toString());
  }
  if (config.proxyType) {
    formData.append("proxyType", config.proxyType);
  }
  formData.append("stabilityMode", config.stabilityMode ? "true" : "false");

  const response = await fetch(`${API_BASE_URL}/start`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const stopBot = async () => {
  const response = await fetch(`${API_BASE_URL}/stop`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getBotStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
