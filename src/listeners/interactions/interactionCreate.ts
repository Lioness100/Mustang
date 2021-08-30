import type {
  Constants,
  Interaction,
  TextChannel,
  ButtonInteraction,
  SelectMenuInteraction,
} from 'discord.js';
import type GuildMessage from '#types/GuildMessage';
import type RoleEntry from '#types/RoleEntry';
import { MessageEmbed, Message, MessageButton, MessageActionRow, GuildMember } from 'discord.js';
import Listener from '#structures/Listener';
import fs from 'fs/promises';

const raw = await fs.readFile('./data/roles.json', 'utf8');
const roles: RoleEntry[] = JSON.parse(raw);

export default class UserListener extends Listener<typeof Constants.Events.INTERACTION_CREATE> {
  public run(interaction: Interaction) {
    if (interaction.isButton()) {
      return ['sub', 'unsub'].includes(interaction.customId)
        ? this.handleSubscriptionUpdate(interaction)
        : this.handleVerificationJudgement(interaction);
    }

    if (interaction.isSelectMenu()) {
      const entry = roles.find(({ type }) => type === interaction.customId);
      if (entry) {
        return this.handleRoleSelection(interaction, entry);
      }
    }
  }

  private async handleRoleSelection(interaction: SelectMenuInteraction, entry: RoleEntry) {
    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : await interaction.guild!.members.fetch(interaction.member!.user.id).catch(() => null);

    if (!member) {
      return;
    }

    if (!member.roles.cache.has(process.env.MHS_ROLE)) {
      return interaction.reply({
        content: "❌ You're not an MHS student!",
        ephemeral: true,
      });
    }

    const wantedRole = entry.roles.find(({ label }) => interaction.values[0] === label)!;
    const previousRole = entry.roles.find(({ id }) =>
      member.roles.cache.some((role) => role.id === id)
    );

    if (previousRole) {
      if (previousRole.id === wantedRole.id) {
        return interaction.reply({
          content: '❌ You already have this class role!',
          ephemeral: true,
        });
      }

      if (previousRole.notifs && member.roles.cache.has(previousRole.notifs)) {
        await member.roles.remove(previousRole.notifs);
      }

      await member.roles.remove(previousRole.id);
    }

    await member.roles.add(wantedRole.id);
    return interaction.reply({
      content: "✅ OK, you've been given that class role",
      ephemeral: true,
    });
  }

  private async handleSubscriptionUpdate(interaction: ButtonInteraction) {
    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : await interaction.guild!.members.fetch(interaction.member!.user.id).catch(() => null);

    if (!member) {
      return;
    }

    const message = (await this.getMessage(interaction)) as GuildMessage;
    if (!member.roles.cache.has(process.env.MHS_ROLE)) {
      return interaction.reply({
        content: "❌ You're not an MHS student!",
        ephemeral: true,
      });
    }

    const selectMenu = message.components[0].components[0];
    const entry = roles.find(({ type }) => type === selectMenu.customId);
    if (!entry) {
      return;
    }

    const role = entry.roles.find(({ id }) => member.roles.cache.has(id));
    if (interaction.customId === 'sub') {
      if (!role) {
        return interaction.reply({
          content: "❌ You need to specify what class you're in to receive notifications!",
          ephemeral: true,
        });
      }

      await member.roles.add(role.notifs!);
      return interaction.reply({
        content: "✅ You've subscribed to this class' notifications!",
        ephemeral: true,
      });
    }

    if (interaction.customId === 'unsub') {
      if (!role || !member.roles.cache.has(role.notifs!)) {
        return interaction.reply({
          content: "❌ You're not currently subscribed to this class' notifications!",
          ephemeral: true,
        });
      }

      await member.roles.remove(role.notifs!);
      return interaction.reply({
        content: "✅ You've unsubscribed to this class' notifications!",
        ephemeral: true,
      });
    }
  }

  private async handleVerificationJudgement(interaction: ButtonInteraction) {
    const user = await this.container.users.findOne({ applicationMessage: interaction.message.id });
    if (!user) {
      return;
    }

    const embed = (description: string, color = process.env.COLOR) =>
      new MessageEmbed()
        .setAuthor(interaction.user.tag, interaction.user.displayAvatarURL({ dynamic: true }))
        .setColor(color)
        .setDescription(description);

    await interaction.reply({
      embeds: [embed(`OK, I'll ${interaction.customId} this user!`)],
    });

    const message = await this.getMessage(interaction);
    await message.edit({ components: [] });

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

      const sentInteraction = (await interaction.followUp({
        embeds: [
          embed(
            "Is this student from MHS? If you don't answer in 30 seconds, I'll assume the answer is yes."
          ),
        ],
        components: [row],
        fetchReply: true,
      })) as Message;

      const collected = await sentInteraction
        .awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          componentType: 'BUTTON',
          time: 30000,
        })
        .catch(() => null);

      await sentInteraction.delete();
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

  private getMessage(interaction: ButtonInteraction | SelectMenuInteraction) {
    if (interaction.message instanceof Message) {
      return interaction.message;
    }

    const channel =
      interaction.channel ??
      (this.client.guild.channels.cache.get(interaction.message.channel_id) as TextChannel);

    return channel.messages.fetch(interaction.message.id);
  }
}
