import type { TextChannel } from 'discord.js';
import type { Events } from '@sapphire/framework';
import type GuildMessage from '#types/GuildMessage';
import { MessageActionRow, MessageButton } from 'discord.js';
import { toTitleCase } from '@sapphire/utilities';
import { getColor } from 'colorthief';
import Listener from '#structures/Listener';

export default class UserListener extends Listener<typeof Events.MessageCreate> {
  public async run(message: GuildMessage) {
    if (message.channel.id !== process.env.VERIFICATION_CHANNEL) {
      return;
    }

    const name = message.content;
    await message.delete();

    if (!name || message.member.roles.cache.size > 1) {
      return;
    }

    await message.channel.permissionOverwrites.edit(message.author, {
      VIEW_CHANNEL: false,
      SEND_MESSAGES: false,
    });

    const logChannel = message.guild.channels.cache.get(
      process.env.VERIFICATION_LOG_CHANNEL
    ) as TextChannel;

    const color = await getColor(message.author.displayAvatarURL({ format: 'png' })).catch(
      () => this.container.client.color
    );

    const nickname = toTitleCase(name);
    const created = `<t:${Math.floor(message.author.createdTimestamp / 1000)}:R>`;
    const embed = this.container
      .embed(message, `Would you like to allow access to "${nickname}" (${message.author})?`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setColor(color)
      .setTitle('Verification Request')
      .addField('❯ Account Created', created);

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('verify')
        .setLabel('Verify')
        .setEmoji('✅')
        .setStyle('SUCCESS'),
      new MessageButton().setCustomId('kick').setLabel('Kick').setEmoji('👢').setStyle('SECONDARY'),
      new MessageButton().setCustomId('ban').setLabel('Ban').setEmoji('🔨').setStyle('DANGER')
    );

    const sentMessage = await logChannel.send({ embeds: [embed], components: [row] });
    const user = this.container.users.create({
      _id: message.author.id,
      applicationMessage: sentMessage.id,
      nickname,
    });

    return this.container.users.persist(user).flush();
  }
}
