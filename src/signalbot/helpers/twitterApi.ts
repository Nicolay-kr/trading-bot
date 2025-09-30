import "dotenv/config";
import { writeFileSync } from "fs";

import { Client, auth } from "twitter-api-sdk";

const authClient = new auth.OAuth2User({
  client_id: process.env.TWITTER_API_KEY as string,
  client_secret: process.env.TWITTER_API_KEY_SECRET as string,
  callback: "YOUR-CALLBACK",
  scopes: ["tweet.read", "users.read", "offline.access"],
});

// const client = new Client(process.env.TWITTER_BEARER_TOKEN!);
const client = new Client(authClient);

export async function getUserByUsername(username: string): Promise<any> {
  try {
    const user = await client.users.findUserByUsername(username);
    return user.data;
  } catch (error) {
    console.error("Error fetching user by username:", error);
  }
}

// getUserByUsername("Mikalai_kr")
//   .then(user => console.log(user))
//   .catch(err => console.error(err));

async function getAllFollowing(userName: string): Promise<string[]> {
  const user = await client.users.findUserByUsername(userName);
  console.log("user", user);

  if (!user.data?.id) throw new Error("Could not determine current user id");

  const all: string[] = [];

  // async iterator automatically handles pagination
  for await (const page of client.users.usersIdFollowing(user.data.id, {
    max_results: 2500,
  })) {
    if (page.data) {
      all.push(...page.data.map((u) => u.username));
    }
  }

  return all;
}

(async () => {
  try {
    const following = await getAllFollowing("CryptoVikings07");

    // save to a text file (one username per line)
    writeFileSync("following.txt", following.join("\n"), "utf8");

    console.log(`✅ Saved ${following.length} usernames to following.txt`);
  } catch (err) {
    console.error("Error fetching followings:", err);
  }
})();
