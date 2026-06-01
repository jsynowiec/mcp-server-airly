import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    AIRLY_API_TOKEN: z.string(),
    AIRLY_LANGUAGE: z.enum(["en", "pl"]).default("en"),
    AIRLY_DEFAULT_LATITUDE: z.number().min(-90).max(90).optional(),
    AIRLY_DEFAULT_LONGITUDE: z.number().min(-180).max(180).optional(),
  })
  .refine((data) => {
    if (data.AIRLY_DEFAULT_LATITUDE && !data.AIRLY_DEFAULT_LONGITUDE) {
      return false;
    }
    if (data.AIRLY_DEFAULT_LONGITUDE && !data.AIRLY_DEFAULT_LATITUDE) {
      return false;
    }
    return true;
  }, "AIRLY_DEFAULT_LATITUDE and AIRLY_DEFAULT_LONGITUDE must both be set or both omitted.");

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
