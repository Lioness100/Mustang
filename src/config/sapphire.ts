import type { SapphireClientOptions } from '@sapphire/framework';
import type { ClientOptions } from 'discord.js';
import { Intents } from 'discord.js';
import loggerOptions from '#config/logger';
import Logger from '#structures/Logger';

const prefix = process.env.PREFIX;
const name = process.env.PRESENCE_NAME;
const type = process.env.PRESENCE_TYPE;

const options: SapphireClientOptions & ClientOptions = {
  allowedMentions: { parse: ['users', 'roles'] },
  caseInsensitiveCommands: true,
  caseInsensitivePrefixes: true,
  enableLoaderTraceLoggings: false,
  fetchPrefix: (message) => (message.guild ? prefix : [prefix, '']),
  loadDefaultErrorListeners: false,
  logger: {
    instance: new Logger(loggerOptions),
  },
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
};

if (name && type) {
  options.presence = { activities: [{ name, type }] };
}

export default options;
