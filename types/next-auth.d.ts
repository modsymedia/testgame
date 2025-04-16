import { DefaultSession, DefaultUser } from "next-auth";

// Twitter profile structure
interface TwitterProfile {
  data: {
    id: string;
    name: string;
    username: string;
  };
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
  }

  // Extend the Profile type
  interface Profile {
    data?: {
      id: string;
      name: string;
      username: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    id?: string;
  }
} 