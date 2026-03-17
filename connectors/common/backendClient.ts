import { post } from "./httpClient";
import { config } from "./config";

export const sendIncomingMessage = async (message: any) => {
  try {
    const headers = {
      "x-connector": config.CONNECTOR_NAME,
      "x-api-key": config.API_KEY,
    };

    await post("/messages", message, headers);
  } catch (err) {
    console.error("backendClient error", err);
  }
};