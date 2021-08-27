import type { ListenerOptions, Piece, Store } from '@sapphire/framework';
import type Dict from '#types/Dict';
import { blue, gray, green, magenta, magentaBright, bold } from 'colorette';
import { Listener, Events } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { readFile } from 'fs/promises';

@ApplyOptions<ListenerOptions>({ once: true })
export default class UserEvent extends Listener<typeof Events.ClientReady> {
  public async run() {
    await this.initClassroomReminders();
    await this.printBanner();
    this.printStoreDebugInformation();
  }

  private async initClassroomReminders() {
    let removed = false;
    const reminders = await this.container.reminders.findAll();
    for (const reminder of reminders) {
      const success = await this.container.classroom.startTimers(reminder);
      if (!success) {
        removed = true;
        this.container.reminders.remove(reminder);
      }
    }

    if (removed) {
      await this.container.reminders.flush();
    }

    setInterval(() => void this.container.classroom.listUpdates(), 60000).unref();
  }

  private async printBanner() {
    const pkg: Dict = JSON.parse(await readFile('./package.json', 'utf8'));
    this.container.logger.info(
      `

${magenta(pkg.version)}
[${green('+')}] Gateway
${magenta('<')}${magentaBright('/')}${magenta('>')} ${bold(pkg.name)}

${this.printStoreDebugInformation()}
`
    );
  }

  private printStoreDebugInformation() {
    const stores = [...this.container.client.stores.values()];
    return stores
      .reverse()
      .reduce(
        (list, store) => `${this.styleStore(store, false)}\n${list}`,
        this.styleStore(stores.pop()!, true)
      );
  }

  private styleStore(store: Store<Piece>, last: boolean) {
    return gray(
      `${last ? '└─' : '├─'} Loaded ${blue(store.size.toString().padEnd(3, ' '))} ${store.name}`
    );
  }
}
