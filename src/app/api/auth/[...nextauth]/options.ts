import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const options: NextAuthOptions = {
  secret: process.env.NEXT_AUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],
};
