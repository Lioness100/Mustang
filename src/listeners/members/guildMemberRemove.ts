import type { GuildMember, TextChannel } from 'discord.js';
import type { Events } from '@sapphire/framework';
import Listener from '#structures/Listener';

export default class UserListener extends Listener<typeof Events.GuildMemberRemove> {
  public async run(member: GuildMember) {
    const user = await this.container.users.findOne(member.id);
    if (!user) {
      return;
    }

    await this.container.users.removeAndFlush(user);
    if (!user.verified) {
      const logChannel = member.guild.channels.cache.get(
        process.env.VERIFICATION_LOG_CHANNEL
      ) as TextChannel;

      const applicationMessage = await logChannel.messages
        .fetch(user.applicationMessage)
        .catch(() => null);

      if (!applicationMessage) {
        return;
      }

      await applicationMessage.edit({ components: [] });
      await applicationMessage.reply({
        embeds: [
          this.container
            .embed(applicationMessage, 'This user has left the server')
            .setAuthor(member.user.tag, member.user.displayAvatarURL({ dynamic: true })),
        ],
      });
    }
  }
}
