import type { ColorResolvable, ActivityType, Snowflake, Guild } from 'discord.js';
import type { EntityManager } from '@mikro-orm/core';
import type { ArgType } from '@sapphire/framework';
import type { embed, error } from '#factories/embeds';
import type BaseRepository from '#repositories/BaseRepository';
import type Classroom from '#structures/Classroom';
import type Cancelation from '#entities/Cancelation';
import type Reminder from '#entities/Reminder';
import type User from '#entities/User';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN: string;
      PREFIX: string;
      COLOR: ColorResolvable;
      PRESENCE_NAME: string;
      PRESENCE_TYPE: ActivityType;
      VERIFICATION_CHANNEL: Snowflake;
      MHS_ROLE: Snowflake;
      NON_MHS_ROLE: Snowflake;
      VERIFICATION_LOG_CHANNEL: Snowflake;
      GENERAL_CHANNEL: Snowflake;
      ROLE_CHANNEL: Snowflake;
      CLIENT_ID: string;
      CLIENT_SECRET: string;
      AUTH_URI: string;
      TOKEN_URI: string;
      REDIRECT_URI: string;
      CLASSROOM_CHANNEL: Snowflake;
      CANCELATION_CHANNEL: Snowflake;
    }
  }
}

declare module '@sapphire/framework' {
  class SapphireClient {
    public get guild(): Guild;
  }

  class Command {
    public category: string;
    public usage?: string;

    protected handleArgs<T extends ArgType[keyof ArgType]>(
      getArg: Promise<T>,
      message: string
    ): Promise<T>;
  }

  interface CommandOptions {
    usage?: string;
  }

  interface Preconditions {
    OwnerOnly: never;
    ModOnly: never;
  }
}

declare module '@sapphire/pieces' {
  interface Container {
    embed: typeof embed;
    error: typeof error;

    em: EntityManager;
    users: BaseRepository<User>;
    reminders: BaseRepository<Reminder>;
    cancelations: BaseRepository<Cancelation>;

    classroom: Classroom;
  }
}
