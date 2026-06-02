import crypto from "crypto";

export async function fetchGymStandings(gymId: string, apiKey: string, apiSecret: string) {
  const method = "contest.standings";
  const time = Math.floor(Date.now() / 1000).toString();
  const rand = crypto.randomBytes(3).toString("hex"); // 6 chars
  
  const params = {
    apiKey,
    contestId: gymId,
    time
  };

  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k as keyof typeof params]}`)
    .join("&");
    
  const stringToSign = `${rand}/${method}?${sortedParams}#${apiSecret}`;
  const hash = crypto.createHash("sha512").update(stringToSign).digest("hex");
  const apiSig = `${rand}${hash}`;

  const url = `https://codeforces.com/api/${method}?${sortedParams}&apiSig=${apiSig}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.status !== "OK") {
    throw new Error(data.comment || "Failed to fetch from Codeforces API");
  }
  
  return data.result;
}
