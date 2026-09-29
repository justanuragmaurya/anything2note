import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import { sendEmail } from "./email";

const isLocal = env.BETTER_AUTH_URL.startsWith("http://localhost");

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: "sqlite", schema }),
  trustedOrigins: [
    env.WEB_ORIGIN,
    "anything2note://",
    // Expo Go / dev builds open exp:// links on the local network.
    ...(isLocal ? ["exp://", "exp://**"] : []),
  ],
  user: { deleteUser: { enabled: true } },
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
  plugins: [
    expo(),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        if (isLocal) console.log(`[auth] sign-in code for ${email}: ${otp}`);
        await sendEmail({
          to: email,
          subject: `${otp} is your anything2note code`,
          text: `Your anything2note sign-in code is ${otp}. It expires in 10 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
          html: `<p>Your anything2note sign-in code is</p><p style="font-size:28px;letter-spacing:6px;font-weight:600">${otp}</p><p>It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>`,
        });
      },
    }),
  ],
});
