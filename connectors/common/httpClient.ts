import axios from "axios";
import { config } from "./config";

export const httpClient = axios.create({
  baseURL: config.BACKEND_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const post = async (url: string, data: any, headers = {}) => {
  return httpClient.post(url, data, { headers });
};

export const get = async (url: string, headers = {}) => {
  return httpClient.get(url, { headers });
};