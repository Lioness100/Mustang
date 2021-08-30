import type { Snowflake } from 'discord.js';
import { Property, Entity, ArrayType } from '@mikro-orm/core';
import BaseEntity from '#entities/BaseEntity';

@Entity()
export default class Cancelation extends BaseEntity {
  @Property()
  public timestamp: number = Date.now();

  @Property({ nullable: true })
  public reason?: string;

  @Property({ type: ArrayType })
  public attachments!: string[];

  @Property({ type: 'string' })
  public canceler!: Snowflake;

  @Property({ type: 'string' })
  public cancelee!: Snowflake;
}
