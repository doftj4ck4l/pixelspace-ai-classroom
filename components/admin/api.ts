export const jsonFetch = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(data?.error ?? "Ralat berlaku. Cuba lagi.");
  }
  return data as T;
};

export const postJson = <T>(url: string, body: unknown) =>
  jsonFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const patchJson = <T>(url: string, body: unknown) =>
  jsonFetch<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
