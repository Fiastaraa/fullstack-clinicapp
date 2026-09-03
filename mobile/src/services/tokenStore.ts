import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "assistdoc_patient_token";

export function readToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
