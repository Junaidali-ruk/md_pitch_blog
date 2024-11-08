import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user: { name, email, image }, profile }) {
      const githubId = profile?.id;
      const login = profile?.login;
      const bio = profile?.bio;

      if (!githubId || !login) return false; // Ensure profile and required fields are defined

      const existingUser = await client
        .withConfig({ useCdn: true })
        .fetch(AUTHOR_BY_GITHUB_ID_QUERY, { id: githubId });

      if (!existingUser) {
        await writeClient.create({
          _type: "author",
          id: githubId,
          name,
          username: login,
          email,
          image,
          bio: bio || "",
        });
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const user = await client
          .withConfig({ useCdn: true })
          .fetch(AUTHOR_BY_GITHUB_ID_QUERY, { id: profile.id });

        token.id = user?._id;
      }

      return token;
    },
    async session({ session, token }) {
      session.id = token.id;
      return session;
    },
  },
});
