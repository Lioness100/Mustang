import type { Events, ListenerErrorPayload } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import { redBright, bold } from 'colorette';

export default class UserListener extends Listener<typeof Events.ListenerError> {
  public run(error: Error, { piece }: ListenerErrorPayload) {
    this.container.logger.fatal(
      new Error(`${redBright(bold(`[${piece.name}]`))}\n${error.stack || error.message}`)
    );
  }
}
