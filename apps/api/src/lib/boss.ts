import PgBoss from "pg-boss";
import { apiEnv } from "../env.js";

let bossPromise: Promise<PgBoss> | undefined;

// Cette fonction mutualise l'accès à la file pg-boss.
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({
        connectionString: apiEnv.DATABASE_URL,
        schema: apiEnv.PG_BOSS_SCHEMA
      });

      await boss.start();
      return boss;
    })();
  }

  return bossPromise;
}