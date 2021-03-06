import { SnowflakeRegex } from '@sapphire/discord.js-utilities';
import { Util } from 'discord.js';
import has from '#lib/env/validate';

const tokenRegex = /^[A-Za-z\d]{24}\.[\w-]{6}\.[\w-]{27}$/;

const name = process.env.PRESENCE_NAME;
const type = process.env.PRESENCE_TYPE;
const types = ['PLAYING', 'LISTENING', 'WATCHING', 'COMPETING'];

has('PREFIX');
has('TOKEN', (val) => tokenRegex.test(val) || 'is not a valid token');
has('COLOR', (val) => Util.resolveColor(val) || 'is not a valid color');
has('PRESENCE_NAME', (val) => val && !type && 'must be coupled with "PRESENCE_TYPE"', false);
has('PRESENCE_TYPE', (val) => val && !name && 'must be coupled with "PRESENCE_NAME"', false);
has('PRESENCE_TYPE', (val) => types.includes(val) || `must be one of ${types.join(', ')}`, false);
has('VERIFICATION_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
has('MHS_ROLE', (val) => SnowflakeRegex.test(val) || 'is not a valid role ID');
has('NON_MHS_ROLE', (val) => SnowflakeRegex.test(val) || 'is not a valid role ID');
has('VERIFICATION_LOG_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
has('GENERAL_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
has('ROLE_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
has('CLIENT_ID');
has('CLIENT_SECRET');
has('REDIRECT_URI');
has('CLASSROOM_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
has('CANCELATION_CHANNEL', (val) => SnowflakeRegex.test(val) || 'is not a valid channel ID');
