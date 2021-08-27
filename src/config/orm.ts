import type { Options } from '@mikro-orm/core';
import BaseRepository from '#repositories/BaseRepository';
import BaseEntity from '#entities/BaseEntity';
import Reminder from '#entities/Reminder';
import User from '#entities/User';

const options: Options = {
  entityRepository: BaseRepository,
  entities: [BaseEntity, User, Reminder],
  type: 'mongo',
};

export default options;
