import type { Options } from '@mikro-orm/core';
import BaseRepository from '#repositories/BaseRepository';
import BaseEntity from '#entities/BaseEntity';
import User from '#root/lib/database/entities/User';

const options: Options = {
  entityRepository: BaseRepository,
  entities: [BaseEntity, User],
  type: 'mongo',
};

export default options;
