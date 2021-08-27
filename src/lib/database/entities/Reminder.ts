import { Property, Entity } from '@mikro-orm/core';
import BaseEntity from '#entities/BaseEntity';

@Entity()
export default class Reminder extends BaseEntity {
  @Property()
  public courseWorkId!: string;

  @Property()
  public courseId!: string;
}
