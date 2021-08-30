import type { CommandOptions, Args } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import Command from '#structures/Command';

@ApplyOptions<CommandOptions>({
  aliases: ['cancels'],
  description: "View someone's cancelation count",
  usage: '<member>',
})
export class UserCommand extends Command {
  public async run(message: Message, args: Args) {
    const member = await this.handleArgs(
      args.pick('member'),
      'Please provide a member to view cancelations of'
    );

    const cancelsGiven = await this.container.cancelations.count({ canceler: member.id });
    const cancelsTaken = await this.container.cancelations.count({ cancelee: member.id });

    return this.container.embed(
      message,
      [
        `${member} has canceled ${cancelsGiven} times and has been canceled ${cancelsTaken} times!`,
        `*Use \`${process.env.PREFIX}cancelation <user> <idx>\` to find a specific cancelation*`,
      ].join('\n\n'),
      true
    );
  }
}
