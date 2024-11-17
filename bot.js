require('dotenv').config();
global.ReadableStream = global.ReadableStream || require('stream/web').ReadableStream;
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require('discord.js');
const {
    handleCommand,
    filterBlacklistedWords,
    detectAndHandleSpam,
    detectAndHandleMassJoins,
    enforceAccountAgeRestriction
} = require('./commands.js');
const express = require('express');

const deletedMessages = new Map();

const app = express();
app.get('/', (req, res) => {
    res.send('Bot en cours d\'exécution !');
});
app.listen(3000, () => {});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.login(process.env.BOT_TOKEN);

client.once('ready', () => {});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    await filterBlacklistedWords(message);
    await detectAndHandleSpam(message);

    const photoOnlyChannelIDs = ['1307120616108724275', '1294651685817290763'];

    if (photoOnlyChannelIDs.includes(message.channel.id)) {
        if (message.hasThread) return;
        if (message.attachments.size > 0) {
            const isMedia = message.attachments.every(attachment => {
                const fileType = attachment.contentType || '';
                return fileType.startsWith('image/') || fileType.startsWith('video/');
            });
            if (isMedia) return;
        }
        await message.delete().catch(console.error);
        message.author.send(
            `🚫 Seules les photos ou vidéos sont autorisées dans le canal **${message.channel.name}**. Les messages texte doivent être envoyés dans un fil.`
        ).catch(console.error);
    }

    if (message.content.startsWith('+')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        await handleCommand(command, message, args, deletedMessages);
    }
});

client.on('guildMemberAdd', async (member) => {
    await enforceAccountAgeRestriction(member);
    await detectAndHandleMassJoins(member);

    const roles = {
        "nomade": "1294636303744499733",
        "gosse_des_rues": "1294636361067790386",
        "corpo": "1294636131635171429"
    };

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`Bienvenue sur ${member.guild.name} !`)
        .setDescription(
            `${member.user}, bienvenue sur le serveur ! Merci de sélectionner votre rôle dans la liste ci-dessous :\n\n` +
            "1️⃣ **Nomade** : Voyageurs, toujours en mouvement.\n" +
            "2️⃣ **Gosse des Rues** : Malins et débrouillards.\n" +
            "3️⃣ **Corpo** : Stratèges du monde des entreprises.\n\n" +
            "Choisissez avec soin !"
        );

    const roleMenu = new StringSelectMenuBuilder()
        .setCustomId('selection_role')
        .setPlaceholder('Sélectionnez votre rôle...')
        .addOptions([
            {
                label: 'Nomade',
                description: 'Voyageurs, toujours en mouvement.',
                value: 'nomade',
                emoji: '🟤'
            },
            {
                label: 'Gosse des Rues',
                description: 'Malins et débrouillards.',
                value: 'gosse_des_rues',
                emoji: '🟠'
            },
            {
                label: 'Corpo',
                description: 'Stratèges du monde des entreprises.',
                value: 'corpo',
                emoji: '🟢'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(roleMenu);

    const welcomeChannelId = '1307403399607877673';
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

    if (welcomeChannel && welcomeChannel.isTextBased()) {
        try {
            await welcomeChannel.send({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {}
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'selection_role') {
        const selectedRole = interaction.values[0];
        const roles = {
            "nomade": { id: "1294636303744499733", color: "8b4513" },
            "gosse_des_rues": { id: "1294636361067790386", color: "ff5733" },
            "corpo": { id: "1294636131635171429", color: "3cb371" }
        };

        const roleDetails = roles[selectedRole];
        const afterlifeChannelID = '1294632351103582258';

        if (!roleDetails) {
            return interaction.reply({
                content: "Désolé, une erreur s'est produite lors de l'attribution de votre rôle.",
                ephemeral: true
            });
        }

        try {
            const role = interaction.guild.roles.cache.get(roleDetails.id);
            if (role) {
                await interaction.member.roles.add(role);

                const initialRole = interaction.guild.roles.cache.get('1307408129285423104');
                if (initialRole) {
                    await interaction.member.roles.remove(initialRole);
                }

                const welcomeChannel = interaction.guild.channels.cache.get('1307403399607877673');
                if (welcomeChannel && welcomeChannel.isTextBased()) {
                    const dropdownMessage = await welcomeChannel.messages.fetch(interaction.message.id);
                    if (dropdownMessage) {
                        await dropdownMessage.delete();
                    }
                }

                const afterlifeChannel = interaction.guild.channels.cache.get(afterlifeChannelID);
                if (afterlifeChannel && afterlifeChannel.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setColor(`#${roleDetails.color}`)
                        .setDescription(
                            `🎉 Bienvenue à **Night City**, ${interaction.member} ! Vous avez choisi le rôle **${role.name}**. Profitez de votre séjour !`
                        );
                    await afterlifeChannel.send({ embeds: [embed] });
                }

                await interaction.reply({
                    content: `🎉 Vous avez reçu le rôle **${role.name}** ! Cliquez ici pour accéder au canal **Afterlife** : <#${afterlifeChannelID}>.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: "Désolé, le rôle sélectionné est introuvable.",
                    ephemeral: true
                });
            }
        } catch (error) {}
    }
});

client.on('messageDelete', (message) => {
    if (message.partial || !message.guild || message.author.bot) return;
    deletedMessages.set(message.channel.id, {
        content: message.content,
        author: message.author.tag,
        timestamp: message.createdTimestamp,
    });

    setTimeout(() => deletedMessages.delete(message.channel.id), 300000);
});
