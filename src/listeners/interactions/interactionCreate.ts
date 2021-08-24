import type { Constants, Interaction, TextChannel } from 'discord.js';
import { MessageEmbed, Message, MessageButton, MessageActionRow } from 'discord.js';
import Listener from '#structures/Listener';

export default class UserListener extends Listener<typeof Constants.Events.INTERACTION_CREATE> {
  public async run(interaction: Interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const user = await this.container.users.findOne({ applicationMessage: interaction.message.id });
    if (!user) {
      return;
    }

    const embed = (description: string, color = this.client.color) =>
      new MessageEmbed()
        .setAuthor(interaction.user.tag, interaction.user.displayAvatarURL({ dynamic: true }))
        .setColor(color)
        .setDescription(description);

    await interaction.reply({
      embeds: [embed(`OK, I'll ${interaction.customId} this user!`)],
    });

    let channel;

    if (interaction.message instanceof Message) {
      await interaction.message.edit({ components: [] });
    } else {
      channel = this.client.guild.channels.cache.get(interaction.message.channel_id) as TextChannel;
      const message = await channel.messages.fetch(interaction.message.id);
      await message.edit({ components: [] });
    }

    const member = await interaction.guild!.members.fetch(user._id).catch(() => null);
    if (!member) {
      return interaction.followUp({
        embeds: [embed("Sorry, I couldn't find the user!").setColor('RED')],
      });
    }

    if (interaction.customId === 'verify') {
      const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('mhs').setLabel('Yes').setEmoji('👍').setStyle('SUCCESS'),
        new MessageButton().setCustomId('non_mhs').setLabel('No').setEmoji('👎').setStyle('DANGER')
      );

      const sentInteraction = await interaction.followUp({
        embeds: [
          embed(
            "Is this student from MHS? If you don't answer in 30 seconds, I'll assume the answer is yes."
          ),
        ],
        components: [row],
      });

      let sentMessage;

      if (sentInteraction instanceof Message) {
        sentMessage = sentInteraction;
      } else {
        channel ??= this.client.guild.channels.cache.get(sentInteraction.channel_id) as TextChannel;
        sentMessage = await channel.messages.fetch(interaction.message.id);
      }

      const collected = await sentMessage
        .awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          componentType: 'BUTTON',
          time: 30000,
        })
        .catch(() => null);

      collected?.update({});
      await sentMessage.delete();
      const isMhs = (collected?.customId ?? 'mhs') === 'mhs';

      await member.setNickname(user.nickname);
      await member.roles.add(isMhs ? process.env.MHS_ROLE : process.env.NON_MHS_ROLE);

      const generalChannel = member.guild.channels.cache.get(
        process.env.GENERAL_CHANNEL
      ) as TextChannel;

      await generalChannel.send({
        content: `${member} 🎉🎉`,
        embeds: [embed('Welcome to the MHS 9th Grade server!')],
      });

      user.verified = true;
      this.container.users.flush();
    } else {
      if (interaction.customId === 'kick') {
        await member.kick('Rejected verification');
      } else {
        await member.ban({ reason: 'Rejected verification' });
      }

      this.container.users.remove(user).flush();
    }
  }
}
