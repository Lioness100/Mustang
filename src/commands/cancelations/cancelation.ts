import type { CommandOptions, Args } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { MessageAttachment } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import Command from '#structures/Command';

@ApplyOptions<CommandOptions>({
  aliases: ['vcancel'],
  description: 'View a specific cancelation of someone',
  usage: '<member> <index>',
})
export class UserCommand extends Command {
  public async run(message: Message, args: Args) {
    const member = await this.handleArgs(
      args.pick('member'),
      'Please provide a member to view a cancelation of'
    );

    const cancelsTaken = await this.container.cancelations.find({ cancelee: member.id });
    if (!cancelsTaken.length) {
      throw `${member} has never been canceled! [#BeLike${member.user.username}](https://www.youtube.com/watch?v=dQw4w9WgXcQ)`;
    }

    const idx = await this.handleArgs(
      args.pick('number', { minimum: 1, maximum: cancelsTaken.length }),
      `Please provide a number between 1 and ${cancelsTaken.length}`
    );

    const cancelation = cancelsTaken[idx - 1];
    const embed = this.container.embed(message);
    embed
      .addField('❯ Cancelation Date', `<t:${Math.floor(cancelation.timestamp / 1000)}:d>`, true)
      .addField(`❯ Canceler`, `<@${cancelation.canceler}>`, true);

    if (cancelation.reason) {
      embed.addField('❯ Reason', cancelation.reason);
    }

    if (
      cancelation.attachments.length === 1 &&
      /\.(?:png|jpg|jpeg|webp|gif)$/.test(cancelation.attachments[0])
    ) {
      embed.setImage(cancelation.attachments[0]);
      return send(message, { embeds: [embed] });
    }

    return send(message, {
      files: cancelation.attachments.map((url) => new MessageAttachment(url)),
      embeds: [embed],
    });
  }
}
