import type { Options } from '@mikro-orm/core';
import BaseRepository from '#repositories/BaseRepository';
import BaseEntity from '#entities/BaseEntity';
import Guild from '#root/lib/database/entities/User';

const options: Options = {
  entityRepository: BaseRepository,
  entities: [BaseEntity, Guild],
  type: 'mongo',
};

export default options;
