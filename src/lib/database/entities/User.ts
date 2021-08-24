import type { Snowflake } from 'discord.js';
import { Property, Entity } from '@mikro-orm/core';
import BaseEntity from '#entities/BaseEntity';

@Entity()
export default class User extends BaseEntity {
  @Property({ default: false })
  public verified!: boolean;

  @Property()
  public nickname!: string;

  @Property({ type: 'string' })
  public applicationMessage!: Snowflake;
}
