import type { CommandOptions, Args } from '@sapphire/framework';
import type GuildMessage from '#types/GuildMessage';
import { ApplyOptions } from '@sapphire/decorators';
import Command from '#structures/Command';

@ApplyOptions<CommandOptions>({
  description: 'Cancel someone for doing something that needs to be brought to attention!',
  detailedDescription: 'You can cancel someone with text and/or attachments!',
  usage: '<member> <...reason>',
})
export class UserCommand extends Command {
  public async run(message: GuildMessage, args: Args) {
    if (message.channel.id !== process.env.CANCELATION_CHANNEL) {
      throw `This command can only be used in <#${process.env.CANCELATION_CHANNEL}>`;
    }

    const member = await this.handleArgs(args.pick('member'), 'Please provide a member to cancel');
    if (member.id === message.author.id) {
      throw "You can't cancel yourself";
    }

    const reason = await args.rest('string').catch(() => null);
    if (!reason && !message.attachments.size) {
      throw 'You need to provide a reason or attach something to the message as explanation';
    }

    const cancelation = this.container.cancelations.create({
      attachments: message.attachments.map(({ url }) => url),
      canceler: message.author.id,
      cancelee: member.id,
      reason,
    });

    await this.container.cancelations.persist(cancelation).flush();
    await message.react('😔');

    const warnCount = await this.container.cancelations.count({ cancelee: member.id });
    return this.container.embed(message, `${member} has been canceled! >:(`, (embed) =>
      embed.setFooter(
        `${member.user.tag} has now been canceled ${warnCount} time${
          warnCount === 1 ? '' : 's'
        }! Damn...`
      )
    );
  }
}
