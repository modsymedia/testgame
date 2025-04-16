import NextAuth from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';

// Define Twitter profile type
interface TwitterProfile {
  data: {
    id: string;
    name: string;
    username: string;
  };
}

// Configure NextAuth for app router
const handler = NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0', // Use Twitter OAuth 2.0
    }),
    // Add more providers here if needed
  ],
  // Add your custom pages here if you want to override the default ones
  pages: {
    signIn: '/', // Use the home page for sign in
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add user info to the token
      if (account && profile) {
        token.accessToken = account.access_token;
        // Handle Twitter profile which uses a different structure
        const twitterProfile = profile as unknown as TwitterProfile;
        token.id = twitterProfile.data?.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add properties to the session
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      return session;
    },
  },
});

// Export handlers for GET and POST requests
export { handler as GET, handler as POST };
