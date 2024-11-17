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
    res.send('Bot is running!');
});
app.listen(3000, () => {
    console.log('HTTP server running on port 3000');
});

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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    await filterBlacklistedWords(message);

    await detectAndHandleSpam(message);

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
        .setTitle(`Welcome to ${member.guild.name}!`)
        .setDescription(
            `${member.user}, welcome to the server! Please select your role from the dropdown below:\n\n` +
            "1️⃣ **Nomade**: Wanderers, always on the move.\n" +
            "2️⃣ **Gosse des Rues**: Street-smart and resourceful.\n" +
            "3️⃣ **Corpo**: Corporate masterminds.\n\n" +
            "Choose carefully!"
        );

    const roleMenu = new StringSelectMenuBuilder()
        .setCustomId('role_selection')
        .setPlaceholder('Select your role...')
        .addOptions([
            {
                label: 'Nomade',
                description: 'Wanderers, always on the move.',
                value: 'nomade'
            },
            {
                label: 'Gosse des Rues',
                description: 'Street-smart and resourceful.',
                value: 'gosse_des_rues'
            },
            {
                label: 'Corpo',
                description: 'Corporate masterminds.',
                value: 'corpo'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(roleMenu);

    const welcomeChannelId = '1307403399607877673';
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

    if (welcomeChannel && welcomeChannel.isTextBased()) {
        try {
            const message = await welcomeChannel.send({
                embeds: [embed],
                components: [row]
            });

            // Save the message ID for reference
            member.dropdownMessageId = message.id;
        } catch (error) {
            console.error('Could not send role selection menu:', error);
        }
    } else {
        console.error('Welcome channel not found or is not text-based.');
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'role_selection') {
        const selectedRole = interaction.values[0];
        const roles = {
            "nomade": "1294636303744499733",
            "gosse_des_rues": "1294636361067790386",
            "corpo": "1294636131635171429"
        };

        const roleId = roles[selectedRole];

        if (!roleId) {
            return interaction.reply({
                content: "Sorry, an error occurred while assigning your role.",
                ephemeral: true
            });
        }

        try {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                // Assign the selected role
                await interaction.member.roles.add(role);

                // Remove the initial role (1307408129285423104)
                const initialRole = interaction.guild.roles.cache.get('1307408129285423104');
                if (initialRole) {
                    await interaction.member.roles.remove(initialRole);
                }

                // Delete the dropdown message
                const welcomeChannel = interaction.guild.channels.cache.get('1307403399607877673');
                if (welcomeChannel && welcomeChannel.isTextBased()) {
                    const dropdownMessage = await welcomeChannel.messages.fetch(interaction.message.id);
                    if (dropdownMessage) {
                        await dropdownMessage.delete();
                    }
                }

                await interaction.reply({
                    content: `🎉 You have been assigned the **${role.name}** role!`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: "Sorry, the selected role could not be found.",
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error assigning role or deleting message:', error);
            await interaction.reply({
                content: "An error occurred while assigning your role. Please contact an admin.",
                ephemeral: true
            });
        }
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
