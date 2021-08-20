import type { EntityData } from '@mikro-orm/core';
import type { Snowflake } from 'discord.js';
import { Property, Entity } from '@mikro-orm/core';
import BaseEntity from '#entities/BaseEntity';

@Entity()
export default class Guild extends BaseEntity {
  @Property({ default: false })
  public verified!: boolean;

  @Property({ type: 'string' })
  public verificationMessage!: Snowflake;

  @Property()
  public nickname!: string;

  public constructor(data: EntityData<Guild>) {
    super(data);
  }
}
