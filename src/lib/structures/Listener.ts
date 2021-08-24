import type { ListenerOptions, PieceContext } from '@sapphire/framework';
import { RequestContext } from '@mikro-orm/core';
import { Listener } from '@sapphire/framework';

export default abstract class CustomListener<
  E extends string | number | symbol = ''
> extends Listener<E> {
  public constructor(context: PieceContext, options: ListenerOptions) {
    super(context, options);
    const runRef = this.run.bind(this);
    const run = (...args: Parameters<typeof runRef>) => {
      return RequestContext.createAsync(this.container.em, async () => {
        await runRef(...args);
      });
    };

    this.run = run;
  }

  public get client() {
    return this.container.client;
  }
}
