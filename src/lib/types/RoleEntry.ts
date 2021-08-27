import type { Snowflake } from 'discord.js';

interface RoleEntry {
  type: string;
  roles: Array<{ label: string; id: Snowflake; notifs?: Snowflake }>;
}

export default RoleEntry;
