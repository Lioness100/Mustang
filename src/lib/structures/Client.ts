import { SapphireClient } from '@sapphire/framework';
import sapphireOptions from '#config/sapphire';

export default class CustomClient extends SapphireClient {
  public constructor() {
    super(sapphireOptions);
  }

  public get guild() {
    return this.guilds.cache.first()!;
  }
}
