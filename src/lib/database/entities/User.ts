/* eslint-disable @typescript-eslint/no-inferrable-types */
import type { Snowflake } from 'discord.js';
import { Property, Entity } from '@mikro-orm/core';
import BaseEntity from '#entities/BaseEntity';

@Entity()
export default class User extends BaseEntity {
  @Property()
  public verified: boolean = false;

  @Property()
  public nickname!: string;

  @Property({ type: 'string' })
  public applicationMessage!: Snowflake;
}
